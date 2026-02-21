# VizCount

VizCount is a sleek, modern inventory scanning tool built with React Native and Expo. It leverages on-device Machine Learning (MLKit) hardware pipelines to execute high-speed text recognition and OCR directly from the device's camera.

## Core Features

- **Live Camera OCR**: Analyzes and extracts product details (such as dates, batch numbers, and barcodes) seamlessly at 30+ frames per second.
- **Augmented Reality Bounding Boxes**: Automatically tracks the exact text blocks on physical boxes in real-time, mapping 4K camera sensor nodes mathematically down to device DPI bounds using the native `@shopify/react-native-skia` library.
- **Gallery Test Mode**: Test functionality on existing static images with dynamic pan-and-scroll galleries overlaying bounding boxes via Reverse Math Coordinate Extractions.

## Technology Stack

- framework: Expo (React Native)
- rendering: `@shopify/react-native-skia` with native explicit Z-Index elevations
- vision parsing: `react-native-vision-camera-ocr-plus` over `react-native-vision-camera` v4.
- stylization: NativeWind classes with manual Hex-code `.dark` overrides

## Overview
This platform removes the friction of manual product batch validations in high-movement inventory environments like warehouse coolers. By extracting the text blocks and pinpointing them visibly, VizCount provides frictionless workflow automation and counting.
