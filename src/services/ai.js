import { LOW_VARIANCE_OPTIONS } from "../constants/modes";

export function supportsOnDeviceAI() {
  return "Summarizer" in self && "LanguageModel" in self;
}

export async function getSummarizerAvailability() {
  return Summarizer.availability();
}

function modelMonitor(showBanner) {
  return (monitor) => {
    monitor.addEventListener("downloadprogress", (event) => {
      showBanner(
        `Downloading the on-device model — one-time setup (${Math.round(event.loaded * 100)}%).`
      );
    });
  };
}

export async function createSummarizer(mode, showBanner) {
  return Summarizer.create({
    type: mode.type,
    format: "plain-text",
    length: mode.length,
    sharedContext:
      "Summarizing an article extracted from a web page for someone skimming while reading.",
    monitor: modelMonitor(showBanner),
  });
}

export async function getLanguageModelAvailability() {
  return LanguageModel.availability(LOW_VARIANCE_OPTIONS);
}

export async function createLanguageModel(options = {}) {
  return LanguageModel.create({
    ...LOW_VARIANCE_OPTIONS,
    ...options,
  });
}

export { modelMonitor };