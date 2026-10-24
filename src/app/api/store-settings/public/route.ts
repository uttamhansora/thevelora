import { handleError, json } from "@/lib/http";
import { getStoreSettings, publicSettings } from "@/services/settings";

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return json({ settings: publicSettings(settings) });
  } catch (error) {
    return handleError(error);
  }
}
