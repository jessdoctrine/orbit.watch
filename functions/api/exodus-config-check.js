export async function onRequestGet({ env }) {
  const value = env.EXODUS_COLLECTOR_URL;
  const present = typeof value === "string" && value.length > 0;
  const valid = present && /^https:\/\/[^\s]+$/.test(value.trim());

  return Response.json({
    configured: present,
    validHttpsUrl: valid,
    variableType: typeof value
  });
}
