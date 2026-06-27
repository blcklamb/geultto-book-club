export function getRequestOrigin(headers: Headers, fallbackOrigin: string) {
  const forwardedProto = headers.get("x-forwarded-proto");
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost ?? headers.get("host");

  if (!host) {
    return fallbackOrigin;
  }

  const proto =
    forwardedProto ?? (host.startsWith("localhost") || isPrivateHost(host) ? "http" : "https");

  return `${proto}://${host}`;
}

function isPrivateHost(host: string) {
  const hostname = host.split(":")[0];

  return (
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}
