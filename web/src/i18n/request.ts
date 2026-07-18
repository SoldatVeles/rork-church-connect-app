import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = "de";

  const messages = (
    await import(`../../messages/${locale}.json`)
  ).default;

  return {
    locale,
    messages,
  };
});