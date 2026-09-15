import { LOW_VARIANCE_OPTIONS } from "../constants/modes";

const modelMonitor = (showBanner) => (monitor) => {
  monitor.addEventListener("downloadprogress", (event) => {
    showBanner(`Downloading the on-device model — one-time setup (${Math.round(event.loaded * 100)}%).`);
  });
};

export const supportsOnDeviceAI = () => "Summarizer" in self && "LanguageModel" in self;

export const getSummarizerAvailability = async () => Summarizer.availability();

export const createSummarizer = async (mode, showBanner) => Summarizer.create({
  type: mode.type,
  format: "plain-text",
  length: mode.length,
  sharedContext:
    "Summarizing an article extracted from a web page for someone skimming while reading.",
  monitor: modelMonitor(showBanner),
});

export const getLanguageModelAvailability = async () => LanguageModel.availability(LOW_VARIANCE_OPTIONS);

export const createLanguageModel = async (options = {}) => LanguageModel.create({
  ...LOW_VARIANCE_OPTIONS,
  ...options,
});