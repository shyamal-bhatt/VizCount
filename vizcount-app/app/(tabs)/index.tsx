import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, Linking, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTextRecognition, PhotoRecognizer, Text as OCRText } from 'react-native-vision-camera-ocr-plus';
import * as ImagePicker from 'expo-image-picker';
import { useRunOnJS } from 'react-native-worklets-core';
import { Logger } from '../../utils/logger';
import { CarouselModal } from '../../components/CarouselModal';
import { Canvas, Rect, Path, Skia, FillType } from '@shopify/react-native-skia';
import { OpenCV, ObjectType, DataTypes, ColorConversionCodes, BorderTypes } from 'react-native-fast-opencv';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { database } from '../../db';
import { DefinedProduct } from '@/db/models/DefinedProduct';
import { ScannedItem } from '@/db/models/ScannedItem';
import { Q } from '@nozbe/watermelondb';
import { StockPulseHeader } from '@/components/StockPulseHeader';



const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the Region of Interest (ROI) bounds directly in screen coordinates
const ROI_WIDTH = SCREEN_WIDTH * 0.90;
const ROI_HEIGHT = 260;  // Tall enough to cover the full label area
const ROI_X = (SCREEN_WIDTH - ROI_WIDTH) / 2;
// Text Y coords observed in logs: 76-204 (in canvas screen space).
// ROI_Y must sit above that range. We push it up with a larger HEADER_OFFSET.
const HEADER_OFFSET = 270;
const ROI_Y = (SCREEN_HEIGHT - ROI_HEIGHT) / 2 - HEADER_OFFSET;

// Generate the Skia clipping mask path (Full screen dark with a clear hole in the middle)
const overlayPath = Skia.Path.Make();
overlayPath.addRect(Skia.XYWHRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT));
overlayPath.addRect(Skia.XYWHRect(ROI_X, ROI_Y, ROI_WIDTH, ROI_HEIGHT));
overlayPath.setFillType(FillType.EvenOdd);



export default function ScanScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [testImages, setTestImages] = useState<string[]>([]);
  const [ocrResults, setOcrResults] = useState<OCRText[]>([]);
  const [isGalleryModalVisible, setIsGalleryModalVisible] = useState(false);

  // ── Scan status toast (disappearing banner over the camera view) ──
  type ToastType = 'info' | 'success' | 'warning' | 'error';
  interface Toast { message: string; type: ToastType; }
  const [toast, setToast] = useState<Toast | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((message: string, type: ToastType, durationMs = 2500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => setToast(null)
      );
    }, durationMs);
  }, [toastOpacity]);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const { scanText } = useTextRecognition({
    useLightweightMode: true,
    // No frameSkipThreshold — we use a time-based gate (Stage 1) in the worklet
    // for more precise control: exactly 300ms between OCR calls (~3 FPS)
  });

  const { resize } = useResizePlugin();

  const logDebug = useRunOnJS((context: string, msg: string, data: any) => {
    Logger.debug(context, msg, data);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // JS-thread handler: PID lookup → SN extraction → duplicate check → DB save
  // Called from the worklet via runOnJS once both PID + NetKg are stable.
  // ─────────────────────────────────────────────────────────────────
  const resolveAndSave = useRunOnJS(
    async (data: { pid: string; netKg: string; validLines: string[] }) => {
      try {
        // Stage 7 — Query defined_products for this PID
        const results = await database.collections
          .get<DefinedProduct>('defined_products')
          .query(Q.where('pid', parseInt(data.pid)))
          .fetch();

        if (results.length === 0) {
          console.log(`[JS-Resolve] ✗ PID ${data.pid} NOT FOUND in defined_products`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast(`⚠️ PID ${data.pid} not in catalog. Define it first.`, 'error', 4000);
          return;
        }

        const product = results[0];
        const { name, type, pack } = product;
        console.log(`[JS-Resolve] ✓ Product found: name="${name}" type=${type} pack=${pack}`);
        showToast(`✅ ${name} found — reading details…`, 'info', 3000);

        // Stage 7b — Smart SN extraction based on product type
        let sn = `AUTO-${Date.now()}`;
        const lines = data.validLines;

        if (type === 'Chicken') {
          // Chicken: 14-digit number, validated by proximity to "HU" text
          const CHICKEN_SN_RE = /\b(\d{14})\b/;
          // Find if any line contains "HU" — that block is near the SN
          const huLineIdx = lines.findIndex((l) => /\bHU\b/i.test(l));
          // Search lines near HU first, then fall back to all lines
          const searchOrder =
            huLineIdx >= 0
              ? [
                ...lines.slice(Math.max(0, huLineIdx - 2), huLineIdx + 3),
                ...lines,
              ]
              : lines;
          for (const line of searchOrder) {
            const m = line.match(CHICKEN_SN_RE);
            if (m) { sn = m[1]; break; }
          }
        } else if (type === 'Beef' || type === 'Pork') {
          // Beef / Pork: 12-digit number, typically preceded by S/N
          const BEEF_PORK_EXPLICIT = /S\/N\s*(\d{12})/i;
          const BEEF_PORK_BARE = /\b(\d{12})\b/;
          for (const line of lines) {
            const explicit = line.match(BEEF_PORK_EXPLICIT);
            if (explicit) { sn = explicit[1]; break; }
          }
          if (sn.startsWith('AUTO')) {
            for (const line of lines) {
              const bare = line.match(BEEF_PORK_BARE);
              if (bare) { sn = bare[1]; break; }
            }
          }
        }
        // Seafood / Halal / unknown types → AUTO fallback (sn already set)
        console.log(`[JS-SN] type=${type} → extracted SN="${sn}"`);
        console.log(`[JS-SN] All ROI lines passed to SN search:\n  ${lines.join('\n  ')}`);

        // Stage 7d — Duplicate SN check
        // Before saving, verify that this exact SN hasn't already been recorded.
        const snNum = parseInt(sn);
        if (!isNaN(snNum) && snNum > 0) {
          const existing = await database.collections
            .get<ScannedItem>('scanned_items')
            .query(Q.where('sn', snNum))
            .fetch();
          if (existing.length > 0) {
            console.log(`[JS-Dup] SN ${sn} already in scanned_items — skipping`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast(`📄 Already counted — ${name} (SN: ${sn})`, 'warning', 3500);
            return;
          }
        }

        // Stage 7c — Date extraction
        // Scan every ROI line for any recognisable date string.
        // Smaller timestamp = packedOnDate (past), larger = bestBeforeDate (future).
        const parsedTimestamps: number[] = [];
        const MONTH_MAP: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };

        for (const line of lines) {
          // DD/MM/YY or DD/MM/YYYY — most common on Canadian meat labels
          const slashMatches = line.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g) ?? [];
          for (const s of slashMatches) {
            const [d2, m2, y2] = s.split('/').map(Number);
            const year = y2 < 100 ? 2000 + y2 : y2;
            const ts = new Date(year, m2 - 1, d2).getTime();
            if (!isNaN(ts)) parsedTimestamps.push(ts);
          }

          // ISO: YYYY-MM-DD
          const isoMatches = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/g) ?? [];
          for (const s of isoMatches) {
            const ts = new Date(s).getTime();
            if (!isNaN(ts)) parsedTimestamps.push(ts);
          }

          // Text date: DD-MMM-YY or DD MMM YYYY e.g. "25 FEB 26" / "25-FEB-2026"
          const textMatches = line.match(/\b(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{2,4})\b/g) ?? [];
          for (const s of textMatches) {
            const parts = s.split(/[\s\-]/);
            const day = parseInt(parts[0]);
            const mon = MONTH_MAP[parts[1].toLowerCase()];
            const yr = parseInt(parts[2]);
            const year = yr < 100 ? 2000 + yr : yr;
            if (mon !== undefined) {
              const ts = new Date(year, mon, day).getTime();
              if (!isNaN(ts)) parsedTimestamps.push(ts);
            }
          }

          // Canadian label format: "2026FE 25" or "2026FE25" → YYYY + 2-letter month abbrev + DD
          const cargillMatches = line.match(/\b(\d{4})([A-Za-z]{2,3})\s*(\d{1,2})\b/g) ?? [];
          for (const s of cargillMatches) {
            const m = s.match(/(\d{4})([A-Za-z]{2,3})\s*(\d{1,2})/);
            if (m) {
              const year = parseInt(m[1]);
              // 2-letter abbreviation: JA=Jan, FE=Feb, MA=Mar, AP=Apr, MY=May, JN=Jun,
              //                        JL=Jul, AU=Aug, SE=Sep, OC=Oct, NO=Nov, DE=Dec
              const twoLetterMap: Record<string, number> = {
                ja: 0, fe: 1, ma: 2, ap: 3, my: 4, jn: 5,
                jl: 6, au: 7, se: 8, oc: 9, no: 10, de: 11,
              };
              const abbr = m[2].toLowerCase().substring(0, 2);
              const mon2 = twoLetterMap[abbr] ?? MONTH_MAP[m[2].toLowerCase().substring(0, 3)];
              const day = parseInt(m[3]);
              if (mon2 !== undefined) {
                const ts = new Date(year, mon2, day).getTime();
                if (!isNaN(ts)) parsedTimestamps.push(ts);
              }
            }
          }
        }

        // Deduplicate + sort ascending; smaller = packed on, larger = best before
        const uniqueDates = [...new Set(parsedTimestamps)].sort((a, b) => a - b);
        const fallback = Date.now();
        const packedOnDate = uniqueDates.length >= 1 ? uniqueDates[0] : fallback;
        const bestBeforeDate = uniqueDates.length >= 2 ? uniqueDates[uniqueDates.length - 1] : fallback;

        Logger.info('OCR', `Dates parsed: ${uniqueDates.map(t => new Date(t).toLocaleDateString()).join(' | ')} → packed=${new Date(packedOnDate).toLocaleDateString()} bb=${new Date(bestBeforeDate).toLocaleDateString()}`);

        // Stage 8 — Save to WatermelonDB
        Logger.info('OCR', `Product resolved: ${name} (${type}) | SN: ${sn}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        await database.write(async () => {
          const items = database.collections.get('scanned_items');
          await items.create((item: any) => {
            item.pid = parseInt(data.pid);
            item.netKg = parseFloat(data.netKg) || 0;
            item.sn = sn;
            item.name = name;
            item.count = pack;
            item.bestBeforeDate = bestBeforeDate;
            item.packedOnDate = packedOnDate;
          });
        });


        Logger.info('DB', `Saved ${name} (PID ${data.pid}) to WatermelonDB`);
        showToast(`✅ ${name} recorded`, 'success', 3000);
      } catch (error) {
        Logger.error('OCR', 'resolveAndSave failed', error);
      }
    },
    []
  );

  // Hardware frame dimensions for coordinate mapping
  const frameWidth = useSharedValue(1080);
  const frameHeight = useSharedValue(1920);

  // ── Stage 1: Time-based throttle gate ──
  const lastOCRTime = useSharedValue<number>(0);

  // ── Stage 5: Per-field independent rolling buffers (max 5 each) ──
  const pidBuffer = useSharedValue<string[]>([]);
  const netKgBuffer = useSharedValue<string[]>([]);

  // ── Stage 7/8: Combiner + duplicate guard ──
  const lastSavedPID = useSharedValue<string>('');

  // ── Stage 9: Scan lock (prevents duplicate saves during 1.5s window) ──
  const lockScanning = useSharedValue(false);

  // ── Quality warnings (displayed in the UI) ──
  const userWarning = useSharedValue('');

  // Derive cover-fit scale factors for mapping MLKit frame coords → screen coords
  const cameraScale = useDerivedValue(() => {
    const scaleW = SCREEN_WIDTH / frameWidth.value;
    const scaleH = SCREEN_HEIGHT / frameHeight.value;
    return Math.max(scaleW, scaleH);
  });
  const cameraOffsetX = useDerivedValue(() => {
    const renderedW = frameWidth.value * cameraScale.value;
    return (SCREEN_WIDTH - renderedW) / 2;
  });
  const cameraOffsetY = useDerivedValue(() => {
    const renderedH = frameHeight.value * cameraScale.value;
    return (SCREEN_HEIGHT - renderedH) / 2;
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    frameWidth.value = frame.width;
    frameHeight.value = frame.height;

    // ─────────────────────────────────────────────────────────────────
    // STAGE 1 — Frame Throttle Gate
    // Allow OCR only every 300ms (~3 FPS). Prevents CPU overload.
    // ─────────────────────────────────────────────────────────────────
    const now = Date.now();
    if (now - lastOCRTime.value < 300) return;
    lastOCRTime.value = now;

    // ─────────────────────────────────────────────────────────────────
    // STAGE 2 — Quality Gate (OpenCV)
    // Reject blurry, over-exposed, or under-lit frames early.
    // ─────────────────────────────────────────────────────────────────
    const targetHeight = frame.height / 4;
    const targetWidth = frame.width / 4;

    const resizedBuffer = resize(frame, {
      scale: { width: targetWidth, height: targetHeight },
      pixelFormat: 'bgr',
      dataType: 'uint8',
    });

    const bgrMat = OpenCV.frameBufferToMat(targetHeight, targetWidth, 3, resizedBuffer);
    const grayMat = OpenCV.createObject(ObjectType.Mat, targetHeight, targetWidth, DataTypes.CV_8U);
    OpenCV.invoke('cvtColor', bgrMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);

    const laplacianMat = OpenCV.createObject(ObjectType.Mat, targetHeight, targetWidth, DataTypes.CV_64F);
    OpenCV.invoke('Laplacian', grayMat, laplacianMat, DataTypes.CV_64F, 1, 1, 0, BorderTypes.BORDER_DEFAULT);

    const mean = OpenCV.createObject(ObjectType.Mat, 1, 1, DataTypes.CV_64F);
    const stddev = OpenCV.createObject(ObjectType.Mat, 1, 1, DataTypes.CV_64F);

    OpenCV.invoke('meanStdDev', laplacianMat, mean, stddev);
    const stdDevVal = OpenCV.matToBuffer(stddev, 'float64').buffer[0];
    const blurVariance = stdDevVal * stdDevVal;

    OpenCV.invoke('meanStdDev', grayMat, mean, stddev);
    const brightnessVal = OpenCV.matToBuffer(mean, 'float64').buffer[0];

    OpenCV.clearBuffers(); // Free OpenCV memory immediately

    if (blurVariance === 0) return; // Invalid buffer read — skip silently

    console.log(`[S2-Quality] blur=${blurVariance.toFixed(2)} brightness=${brightnessVal.toFixed(1)}`);

    if (blurVariance < 80) {
      console.log(`[S2-Quality] REJECT blurry (variance ${blurVariance.toFixed(2)} < 80)`);
      userWarning.value = 'Image is blurry. Please hold steady.';
      return;
    }
    if (brightnessVal > 220) {
      console.log(`[S2-Quality] REJECT glare (brightness ${brightnessVal.toFixed(1)} > 220)`);
      userWarning.value = 'Too much reflection/glare. Tilt camera.';
      return;
    }
    if (brightnessVal < 40) {
      console.log(`[S2-Quality] REJECT dark (brightness ${brightnessVal.toFixed(1)} < 40)`);
      userWarning.value = 'Too dark. Move to better lighting.';
      return;
    }
    userWarning.value = '';
    console.log('[S2-Quality] PASS ✓');

    // Bail out if a successful scan is locked (Stage 9 cooldown)
    if (lockScanning.value) { console.log('[S1-Gate] Scan locked — skipping'); return; }

    // ─────────────────────────────────────────────────────────────────
    // STAGE 3 — MLKit OCR
    // Run on the original full-resolution frame to preserve accuracy.
    // ─────────────────────────────────────────────────────────────────
    const data = scanText(frame);
    if (!data || !data.blocks || data.blocks.length === 0) {
      console.log('[S3-OCR] No blocks returned by MLKit');
      return;
    }
    console.log(`[S3-OCR] ${data.blocks.length} blocks detected`);

    // ─────────────────────────────────────────────────────────────────
    // STAGE 4 — ROI Spatial Filter
    // Iterate over every LINE (not block) for finer granularity.
    // A line is inside the ROI if its center falls within the ROI rect.
    // ─────────────────────────────────────────────────────────────────
    const validLines: string[] = [];

    for (let b = 0; b < data.blocks.length; b++) {
      const block = data.blocks[b];
      const lines = (block as any).lines as any[];
      if (!lines || lines.length === 0) {
        // Fallback: treat the whole block as one line
        const lf = block.blockFrame;
        const sx = (lf.boundingCenterX * cameraScale.value) + cameraOffsetX.value;
        const sy = (lf.boundingCenterY * cameraScale.value) + cameraOffsetY.value;
        if (sx >= ROI_X && sx <= ROI_X + ROI_WIDTH && sy >= ROI_Y && sy <= ROI_Y + ROI_HEIGHT) {
          validLines.push(block.blockText);
        }
        continue;
      }

      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        const conf = line.confidence;
        if (conf !== undefined && conf < 0.8) continue; // Stage 4a: confidence gate

        const lf = line.lineFrame;
        // Map the line centre from frame-space → screen-space
        const screenCX = (lf.boundingCenterX * cameraScale.value) + cameraOffsetX.value;
        const screenCY = (lf.boundingCenterY * cameraScale.value) + cameraOffsetY.value;

        const insideROI = (
          screenCX >= ROI_X && screenCX <= ROI_X + ROI_WIDTH &&
          screenCY >= ROI_Y && screenCY <= ROI_Y + ROI_HEIGHT
        );

        if (insideROI) {
          console.log(`[S4-ROI] ✓ IN  | "${line.lineText}" @ screen(${screenCX.toFixed(0)},${screenCY.toFixed(0)})`);
          validLines.push(line.lineText);
        } else {
          console.log(`[S4-ROI] ✗ OUT | "${line.lineText}" @ screen(${screenCX.toFixed(0)},${screenCY.toFixed(0)})`);
        }
      }
    }

    if (validLines.length === 0) return;

    logDebug('OCR', `Lines inside ROI (${validLines.length}):`, validLines.join(' | '));

    // ─────────────────────────────────────────────────────────────────
    // STAGE 5 — Field Extraction
    // Run regex on EACH line independently.
    // Push any match into the respective field buffer (max 5 entries).
    // ─────────────────────────────────────────────────────────────────
    // PID: explicit "PID: 12345" OR a bare 5-9 digit number on its own
    // (Cargill labels show PID as a standalone number like "50191456")
    const PID_EXPLICIT_RE = /\bPID[:\s]+(\d{5,9})\b/i;
    const PID_BARE_RE = /^\s*(\d{5,9})\s*$/;   // whole line is just the number
    // NET KG: multiple Cargill formats observed in logs:
    //   "net6.42kg net" (with prefix)   → /net\s*([\d.]+)\s*kg/i
    //   "6.42kg net"    (bare, no prefix) → /([\d.]+)\s*kg\b/i
    const NETKG_PREFIX_RE = /\bnet\s*([\d\.]+)\s*kg/i;
    const NETKG_BARE_RE = /\b([\d\.]+)\s*kg\b/i;
    // Lb fallback (convert to kg on extraction)
    const NETLB_PREFIX_RE = /\bnet\s*([\d\.]+)\s*lb/i;
    const NETLB_BARE_RE = /\b([\d\.]+)\s*lb\b/i;
    // NOTE: SN extraction is handled on the JS thread (Stage 7b) where
    // product type is known. No SN buffer needed in the worklet.

    let newPidBuf = [...pidBuffer.value];
    let newNetKgBuf = [...netKgBuffer.value];

    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];

      // PID: try explicit prefix first ("PID: 50191456"), then bare number whole-line
      const pidExplicit = line.match(PID_EXPLICIT_RE);
      const pidBare = line.match(PID_BARE_RE);
      const pidM = pidExplicit ?? pidBare;
      if (pidM) {
        if (newPidBuf.length >= 5) newPidBuf.shift();
        newPidBuf.push(pidM[1].trim());
        console.log(`[S5-Extract] PID candidate: "${pidM[1].trim()}" from line "${line}"`);
      }

      // Net weight: try "net (num)kg" first, then bare "(num)kg", then Lb fallback
      const netKgM = line.match(NETKG_PREFIX_RE) ?? line.match(NETKG_BARE_RE);
      if (netKgM) {
        // Normalize to 2dp so Lb→Kg (6.418) and direct kg (6.42) both become "6.42"
        const kgNorm = parseFloat(netKgM[1].trim()).toFixed(2);
        if (newNetKgBuf.length >= 5) newNetKgBuf.shift();
        newNetKgBuf.push(kgNorm);
        console.log(`[S5-Extract] NetKg: "${kgNorm}" from line "${line}"`);
      } else {
        const netLbM = line.match(NETLB_PREFIX_RE) ?? line.match(NETLB_BARE_RE);
        if (netLbM) {
          const kg = (parseFloat(netLbM[1]) * 0.453592).toFixed(2); // 2dp to match direct kg reads
          if (newNetKgBuf.length >= 5) newNetKgBuf.shift();
          newNetKgBuf.push(kg);
          console.log(`[S5-Extract] NetLb→Kg: "${netLbM[1]}Lb → ${kg}kg" from line "${line}"`);
        }
      }
    }

    pidBuffer.value = newPidBuf;
    netKgBuffer.value = newNetKgBuf;

    console.log(`[S5-Extract] pidBuf=[${newPidBuf.join(',')}] netKgBuf=[${newNetKgBuf.join(',')}]`);

    // ─────────────────────────────────────────────────────────────────
    // STAGE 6 — Temporal Stabilization
    // Frequency-count each buffer. A value is "stable" when it appears
    // ≥ 3 times in its buffer of 5 (majority consensus).
    // ─────────────────────────────────────────────────────────────────
    const stabilize = (buf: string[]): string | null => {
      'worklet';
      if (buf.length < 3) return null;
      const counts: { [k: string]: number } = {};
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i];
        counts[v] = (counts[v] || 0) + 1;
        if (counts[v] >= 3) return v;
      }
      return null;
    };

    const stablePID = stabilize(newPidBuf);
    const stableNetKg = stabilize(newNetKgBuf);

    console.log(`[S6-Stable] stablePID=${stablePID ?? 'null'} stableNetKg=${stableNetKg ?? 'null'}`);

    // ─────────────────────────────────────────────────────────────────
    // STAGE 7 — Record Combiner + PID Lookup (JS thread)
    // Both PID and NET KG must be stable before crossing to JS.
    // Duplicate guard: skip if this PID was just saved.
    // ─────────────────────────────────────────────────────────────────
    if (!stablePID || !stableNetKg) {
      console.log('[S7-Combiner] Waiting — fields not yet stable');
      return;
    }
    if (stablePID === lastSavedPID.value) {
      console.log(`[S7-Combiner] Duplicate — PID ${stablePID} already saved, skipping`);
      return;
    }

    console.log(`[S7-Combiner] ✓ READY → PID=${stablePID} NetKg=${stableNetKg}. Handing off to JS thread.`);

    // ─────────────────────────────────────────────────────────────────
    // STAGE 8 — Hand off to JS thread
    // resolveAndSave queries defined_products, extracts SN by type,
    // saves to WatermelonDB, and shows haptic + Alert if unknown PID.
    // ─────────────────────────────────────────────────────────────────
    lastSavedPID.value = stablePID;
    resolveAndSave({ pid: stablePID, netKg: stableNetKg, validLines });

    // ─────────────────────────────────────────────────────────────────
    // STAGE 9 — Scan Lock
    // Freeze scanning for 1.5s to prevent duplicate saves.
    // ─────────────────────────────────────────────────────────────────
    lockScanning.value = true;
    // ─────────────────────────────────────────────────────────────────
    // STAGE 10 — User Feedback (green border flash via lockScanning)
    // Haptics are triggered inside saveToDatabase on the JS thread.
    // ─────────────────────────────────────────────────────────────────
    setTimeout(() => {
      lockScanning.value = false;
      // Clear all field buffers so next product starts fresh
      pidBuffer.value = [];
      netKgBuffer.value = [];
    }, 1500);

  }, [scanText, cameraScale, cameraOffsetX, cameraOffsetY]);

  // ROI border: green while scan-locked (just saved), white otherwise
  const roiBorderColor = useDerivedValue(() =>
    lockScanning.value ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.5)'
  );

  // BottomSheet setup
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['12%', '45%'], []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-brand-light dark:bg-brand-dark" edges={['bottom', 'left', 'right']}>
        {/* Header powered by global component replacing previous mockups */}
        <StockPulseHeader />

        {/* Main Camera Prompt Area */}
        {isCameraActive && device ? (
          <View className="flex-1 bg-black relative">
            <Camera
              style={{ flex: 1 }}
              device={device}
              isActive={isCameraActive}
              frameProcessor={frameProcessor}
              onError={(error) => {
                // camera-is-restricted fires when OS temporarily revokes access (background, policy, etc.)
                // Gracefully deactivate — user can tap Start Camera again to recover
                console.warn(`[Camera] Error: ${error.code} — ${error.message}`);
                setIsCameraActive(false);
              }}
            />

            {/* Skia Full Screen Overlay with ROI Cutout */}
            <View className="absolute inset-0 z-10" pointerEvents="none" style={{ elevation: 10 }}>
              <Canvas style={{ flex: 1 }}>
                {/* Dimmed Background Overlay */}
                <Path path={overlayPath} color="rgba(0, 0, 0, 0.6)" />

                {/* Animated ROI Border */}
                <Rect
                  x={ROI_X}
                  y={ROI_Y}
                  width={ROI_WIDTH}
                  height={ROI_HEIGHT}
                  color={roiBorderColor}
                  style="stroke"
                  strokeWidth={3}
                />

              </Canvas>
            </View>

            <View className="absolute top-4 right-4">
              {/* Close Camera Button */}
              <Pressable
                onPress={() => {
                  Logger.info('User Action', 'Close Camera button pressed');
                  setIsCameraActive(false);
                }}
                className="w-12 h-12 bg-black/50 rounded-full items-center justify-center border border-white/20"
              >
                <FontAwesome name="times" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Scan Status Toast */}
            {toast && (
              <Animated.View
                style={{ opacity: toastOpacity }}
                className="absolute bottom-44 left-4 right-4 items-center z-20"
                pointerEvents="none"
              >
                <View
                  className={`flex-row items-center px-5 py-3 rounded-2xl ${toast.type === 'success' ? 'bg-emerald-500/95' :
                    toast.type === 'warning' ? 'bg-amber-500/95' :
                      toast.type === 'error' ? 'bg-red-500/95' :
                        'bg-sky-600/95'
                    }`}
                  style={{ shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
                >
                  <FontAwesome
                    name={
                      toast.type === 'success' ? 'check-circle' :
                        toast.type === 'warning' ? 'exclamation-triangle' :
                          toast.type === 'error' ? 'times-circle' :
                            'info-circle'
                    }
                    size={18}
                    color="white"
                  />
                  <Text className="text-white font-semibold ml-3 text-sm">{toast.message}</Text>
                </View>
              </Animated.View>
            )}

            {/* Warning Prompt (Blur/Glare etc.) */}
            {userWarning.value !== "" && (
              <View className="absolute bottom-32 left-0 right-0 items-center justify-center">
                <View className="bg-orange-500/90 px-6 py-3 rounded-full flex-row items-center">
                  <FontAwesome name="warning" size={16} color="white" className="mr-2" />
                  <Text className="text-white font-bold ml-2">{userWarning.value}</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center bg-brand-light dark:bg-brand-dark px-6">
            <View className="w-20 h-20 bg-gray-100 dark:bg-brand-card rounded-2xl items-center justify-center mb-6">
              <FontAwesome name="camera" size={32} color="#00C4A7" />
            </View>

            <Text className="text-gray-900 dark:text-white text-xl font-bold mb-2">Cooler Scanner</Text>
            <Text className="text-gray-500 dark:text-brand-muted text-center mb-8">
              Point camera at product barcodes to scan inventory
            </Text>

            <View className="w-full space-y-3">
              <Pressable
                onPress={async () => {
                  Logger.info('User Action', 'Start Camera button pressed');
                  if (!hasPermission) {
                    const status = await requestPermission();
                    Logger.info('Permissions', `Camera permission status requested: ${status}`);
                    if (status) {
                      setIsCameraActive(true);
                    } else {
                      Alert.alert(
                        "Permission Required",
                        "Camera access is needed to scan items. Please enable it in your device settings.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Open Settings", onPress: () => Linking.openSettings() }
                        ]
                      );
                    }
                  } else {
                    setIsCameraActive(true);
                  }
                }}
                className="bg-brand-teal flex-row items-center justify-center px-6 py-4 rounded-xl"
              >
                <FontAwesome name="video-camera" size={16} color={isDark ? "#16191C" : "#FFFFFF"} className="mr-2" />
                <Text className="text-white dark:text-brand-dark font-bold text-lg">Start Camera</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  Logger.info('User Action', 'Upload Test Media button pressed');
                  let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsMultipleSelection: true,
                    allowsEditing: false,
                    quality: 1,
                  });

                  if (!result.canceled) {
                    try {
                      const uris = result.assets.map(a => a.uri);
                      setTestImages(uris);
                      setOcrResults([]); // Clear previous
                      setIsGalleryModalVisible(true);

                      // Process each sequentially or via Promise.all
                      const results = await Promise.all(
                        uris.map(uri => PhotoRecognizer({ uri }))
                      );

                      setOcrResults(results);
                      Logger.debug('OCR', `Successfully processed ${results.length} images`);
                    } catch (error: any) {
                      Logger.error('OCR', 'Failed to process gallery media', error?.message || error);
                      Alert.alert("OCR Error", error?.message || "Could not process media structure");
                      setIsGalleryModalVisible(false);
                    }
                  }
                }}
                className="bg-gray-200 dark:bg-brand-card flex-row items-center justify-center px-6 py-4 rounded-xl mt-3"
              >
                <FontAwesome name="image" size={16} color={isDark ? "#E1E3E6" : "#4B5563"} className="mr-2" />
                <Text className="text-gray-800 dark:text-brand-text font-bold text-lg">Upload Test Media</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Collapsible Scans List via Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          backgroundStyle={{
            backgroundColor: isDark ? '#0D0F11' : '#F9FAFB',
            borderTopWidth: 1,
            borderColor: isDark ? '#1D2125' : '#E5E7EB',
          }}
          handleIndicatorStyle={{ backgroundColor: isDark ? '#8B949E' : '#D1D5DB' }}
        >
          <BottomSheetView className="flex-1">
            <View className="flex-row items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-brand-card">
              <View className="flex-row items-center">
                <Text className="text-gray-900 dark:text-white font-bold text-base mr-2">Cooler Scans</Text>
                <View className="px-2 py-0.5 bg-gray-200 dark:bg-brand-card rounded-full">
                  <Text className="text-gray-600 dark:text-brand-muted text-xs">0</Text>
                </View>
              </View>
              <Text className="text-gray-500 dark:text-brand-muted text-sm">Dairy dept.</Text>
            </View>

            {/* Empty State List */}
            <View className="py-12 items-center justify-center">
              <FontAwesome name="cube" size={32} color={isDark ? "#8B949E" : "#9CA3AF"} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text className="text-gray-600 dark:text-brand-muted text-base mb-1">No items scanned yet</Text>
              <Text className="text-gray-400 dark:text-brand-muted opacity-50 text-sm">Start the camera and scan products</Text>
            </View>
          </BottomSheetView>
        </BottomSheet>

        {/* Dynamic Static Photo Carousel For MLKit Tests */}
        <CarouselModal
          visible={isGalleryModalVisible}
          images={testImages}
          ocrResults={ocrResults}
          onClose={() => setIsGalleryModalVisible(false)}
        />

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
