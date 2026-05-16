import axios from "axios";
import { config } from "../config";
import { logger } from "../utils/logger";

interface SmsPayload {
  to: string;
  message: string;
  senderId?: string;
}

export async function sendSms(payload: SmsPayload): Promise<{ success: boolean; provider: string; error?: string }> {
  const providers = [
    { name: config.sms.primaryProvider, apiKey: config.sms.primaryApiKey },
    { name: config.sms.fallbackProvider, apiKey: config.sms.fallbackApiKey },
  ].filter((p) => p.name && p.apiKey);

  for (const provider of providers) {
    try {
      if (provider.name === "africastalking") {
        await sendViaAfricasTalking(payload, provider.apiKey);
      } else if (provider.name === "bongolive") {
        await sendViaBongolive(payload, provider.apiKey);
      } else {
        logger.warn("Unknown SMS provider", { provider: provider.name });
        continue;
      }
      return { success: true, provider: provider.name };
    } catch (err: any) {
      logger.error(`SMS failed via ${provider.name}`, { error: err.message });
    }
  }

  return { success: false, provider: "none", error: "All SMS providers failed" };
}

async function sendViaAfricasTalking(payload: SmsPayload, apiKey: string) {
  const url = "https://api.africastalking.com/version1/messaging";
  await axios.post(
    url,
    new URLSearchParams({
      username: "zictia",
      to: payload.to,
      message: payload.message,
      from: payload.senderId || config.sms.senderId,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
      },
      timeout: 15000,
    }
  );
}

async function sendViaBongolive(payload: SmsPayload, apiKey: string) {
  const url = "https://api.bongolive.co.tz/api/sendSMS";
  await axios.post(
    url,
    {
      sender_id: payload.senderId || config.sms.senderId,
      recipient: payload.to,
      message: payload.message,
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );
}
