const checks = [
  { name: "App Home", url: "https://uzzapp.uzzai.com.br/" },
  { name: "Privacy", url: "https://uzzapp.uzzai.com.br/privacy" },
  { name: "Terms", url: "https://uzzapp.uzzai.com.br/terms" },
  { name: "Support", url: "https://uzzapp.uzzai.com.br/support" },
  { name: "Suporte Alias", url: "https://uzzapp.uzzai.com.br/suporte" },
];

function okStatus(status) {
  return status >= 200 && status < 400;
}

async function headThenGet(url) {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "manual" });
    return head;
  } catch {
    return fetch(url, { method: "GET", redirect: "manual" });
  }
}

async function main() {
  let hasError = false;

  console.log("iOS public URL validation");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log("");

  for (const check of checks) {
    const res = await headThenGet(check.url);
    const location = res.headers.get("location");
    const status = res.status;
    const pass = okStatus(status);

    if (!pass) hasError = true;

    const state = pass ? "OK" : "FAIL";
    const line = `[${state}] ${check.name} -> ${status} ${check.url}`;
    console.log(line);
    if (location) {
      console.log(`      location: ${location}`);
    }
  }

  if (hasError) {
    console.error("\nOne or more URL checks failed.");
    process.exit(1);
  }

  console.log("\nAll URL checks passed.");
}

main().catch((error) => {
  console.error("Unexpected error while validating URLs:", error);
  process.exit(1);
});
