import { LOW_VARIANCE_OPTIONS } from "../constants/modes";

const INPUT_LANG = ["en"];
const OUTPUT_LANG = ["en"];
const INPUT_OUTPUT_OPTIONS = {
	expectedInputs: [{ type: "text", languages: INPUT_LANG }],
	expectedOutputs: [{ type: "text", languages: OUTPUT_LANG }],
}

const modelMonitor = (showBanner) => (monitor) => {
	monitor.addEventListener("downloadprogress", (event) => {
		showBanner(`Downloading the on-device model — one-time setup (${Math.round(event.loaded * 100)}%).`);
	});
};

export const supportsOnDeviceAI = () => "Summarizer" in self && "LanguageModel" in self;

export const getSummarizerAvailability = async (options = {}) => Summarizer.availability({
	expectedInputLanguages: INPUT_LANG,
	outputLanguage: OUTPUT_LANG,
	...options,
});

export const createSummarizer = async (mode, showBanner, options = {}) => Summarizer.create({
	type: mode.type,
	format: "plain-text",
	length: mode.length,
	sharedContext:
		"Summarizing an article extracted from a web page for someone skimming while reading.",
	expectedInputLanguages: INPUT_LANG,
	outputLanguage: OUTPUT_LANG,
	monitor: modelMonitor(showBanner),
	...options,
});

export const getLanguageModelAvailability = async (options = {}) => LanguageModel.availability({
	...INPUT_OUTPUT_OPTIONS,
	...LOW_VARIANCE_OPTIONS,
	...options,
});

export const createLanguageModel = async (options = {}) => LanguageModel.create({
	...INPUT_OUTPUT_OPTIONS,
	...LOW_VARIANCE_OPTIONS,
	...options,
});