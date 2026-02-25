import appCheck from '@react-native-firebase/app-check';

/**
 * Example helper function to securely call your GCP Cloud Function.
 * It automatically fetches the App Check token and attaches it to the request.
 */
export async function sendDataToGCP(payload: any) {
    try {
        // 1. Get the App Check Token
        const { token } = await appCheck().getToken();

        // 2. Send it securely to GCP 
        const GCP_URL = process.env.EXPO_PUBLIC_GCP_CLOUD_FUNCTION_URL!;

        const response = await fetch(GCP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // This is the header GCP expects for App Check validation
                'X-Firebase-AppCheck': token,
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error("App check or network failed:", err);
        throw err;
    }
}
