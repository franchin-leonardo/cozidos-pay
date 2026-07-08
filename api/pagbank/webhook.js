/*
 * PagBank webhook endpoint for transaction status notifications.
 *
 * Configure the webhook URL in PagBank as:
 *   https://<your-domain>/api/pagbank/webhook
 *
 * Optional security:
 *   - Set PAGBANK_WEBHOOK_TOKEN in environment variables.
 *   - PagBank can call: /api/pagbank/webhook?token=<PAGBANK_WEBHOOK_TOKEN>
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const expectedToken = process.env.PAGBANK_WEBHOOK_TOKEN;
  const tokenFromQuery = Array.isArray(req.query?.token)
    ? req.query.token[0]
    : req.query?.token;

  if (expectedToken && tokenFromQuery !== expectedToken) {
    return res.status(401).json({ error: "unauthorized_webhook" });
  }

  const payload = req.body ?? {};

  // Fast ack pattern: return 200 quickly so PagBank does not retry due to timeout.
  // Replace this log with persistence/queue logic when you wire business updates.
  console.log("[pagbank-webhook] notification received", {
    receivedAt: new Date().toISOString(),
    event: payload?.event ?? null,
    notificationCode: payload?.notificationCode ?? null,
    transactionCode: payload?.transactionCode ?? null,
    reference: payload?.reference ?? null,
    payload,
  });

  return res.status(200).json({ ok: true });
}
