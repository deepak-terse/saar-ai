import { useState } from "react";
import { QUIZ_PARTS, LOW_VARIANCE_OPTIONS } from "../constants/modes";
import { createLanguageModel, getLanguageModelAvailability } from "../services/ai";
import {
	buildQuizPrompt,
	buildQuizSchema,
	chunkPageIntoParts,
	createInitialQuiz,
	validateQuizBatch,
	areSameIndexes
} from "../utils/quiz";
import { friendlyError } from "../utils/rendering";

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export const QuizView = ({ active, page, setBanner }) => {
	const [quiz, setQuiz] = useState(() => createInitialQuiz());
	const [loading, setLoading] = useState(false);

	const updateQuiz = (updater) => {
		setQuiz((current) => {
			const next = typeof updater === "function" ? updater(current) : updater;
			return next;
		});
	}

	const startQuiz = async () => {
		if (!page) return;

		const parts = chunkPageIntoParts(page.text, QUIZ_PARTS);
		const next = {
			...createInitialQuiz(quiz.difficulty),
			parts,
			coverage: parts.map(() => ({ askedTopics: [], lastCorrect: null })),
		};

		setQuiz(next);
		await generateBatch(next);
	}

	const generateBatch = async (currentQuiz = quiz) => {
		const loadingQuiz = { ...currentQuiz, status: "loading", errorMessage: "" };
		setQuiz(loadingQuiz);
		setLoading(true);

		if (!("LanguageModel" in self)) {
			setQuiz({
				...loadingQuiz,
				status: "error",
				errorMessage: "This Chrome version doesn't support on-device AI.",
			});
			setLoading(false);
			return;
		}

		const availability = await getLanguageModelAvailability();
		if (availability === "unavailable") {
			setQuiz({
				...loadingQuiz,
				status: "error",
				errorMessage: "On-device AI isn't available for the quiz on this device.",
			});
			setLoading(false);
			return;
		}

		let session;

		try {
			session = await createLanguageModel({
				monitor: (monitor) => {
					monitor.addEventListener("downloadprogress", (event) => {
						setBanner(
							`Downloading the on-device model — one-time setup (${Math.round(
								event.loaded * 100
							)}%).`
						);
					});
				},
			});

			setBanner(null);

			const raw = await session.prompt(buildQuizPrompt(loadingQuiz), {
				responseConstraint: buildQuizSchema(loadingQuiz.parts.length),
				omitResponseConstraintInput: true,
			});

			const batch = validateQuizBatch(raw, loadingQuiz.parts.length);
			if (!batch.length) throw new Error("empty-batch");

			setQuiz({
				...loadingQuiz,
				batch,
				qIndex: 0,
				selected: [],
				answered: false,
				batchScore: { correct: 0, total: batch.length },
				status: "question",
			});
		} catch (err) {
			console.error("Quiz generation failed:", err);
			setQuiz({
				...loadingQuiz,
				status: "error",
				errorMessage: `Couldn't generate quiz questions. ${friendlyError(err)}`,
			});
		} finally {
			session?.destroy?.();
			setLoading(false);
		}
	}

	const recordCoverage = (current, question, correct) => {
		const coverage = current.coverage.map((item) => ({ ...item, askedTopics: [...item.askedTopics] }));
		const target = coverage[question.partIndex];
		if (!target) return coverage;

		target.askedTopics.push(question.question.slice(0, 80));
		if (target.askedTopics.length > 2) target.askedTopics.shift();
		target.lastCorrect = correct;
		return coverage;
	}

	const submitAnswer = () => {
		const question = quiz.batch?.[quiz.qIndex];
		if (!question || quiz.answered || !quiz.selected.length) return;

		const correct = areSameIndexes(quiz.selected, question.correctIndexes);

		updateQuiz((current) => ({
			...current,
			answered: true,
			lastAnswerCorrect: correct,
			batchScore: {
				...current.batchScore,
				correct: current.batchScore.correct + (correct ? 1 : 0),
			},
			coverage: recordCoverage(current, question, correct),
		}));
	}

	const nextQuestion = () => {
		if (quiz.qIndex + 1 < quiz.batch.length) {
			updateQuiz((current) => ({
				...current,
				qIndex: current.qIndex + 1,
				selected: [],
				answered: false,
			}));
			return;
		}

		updateQuiz((current) => ({
			...current,
			totalScore: {
				correct: current.totalScore.correct + current.batchScore.correct,
				total: current.totalScore.total + current.batchScore.total,
			},
			batchIndex: current.batchIndex + 1,
			status: "batch-result",
		}));
	}

	const finishQuiz = () => {
		updateQuiz((current) => ({
			...current,
			lastResult: { ...current.totalScore },
			status: "setup",
			batch: null,
		}));
	}

	const restartQuiz = () => updateQuiz((current) => createInitialQuiz(current.difficulty));

	const selectOption = (index, checked, multiple) => {
		updateQuiz((current) => ({
			...current,
			selected: multiple
				? checked
					? [...current.selected, index]
					: current.selected.filter((value) => value !== index)
				: [index],
		}));
	}

	if (!page) {
		return (
			<section id="panel-quiz" className={`view${active ? " is-active" : ""}`} role="tabpanel" aria-labelledby="tab-quiz" hidden={!active}>
				<div className="quiz-body">
					<p className="empty-state">Open a page to take a quiz on it.</p>
				</div>
			</section>
		);
	}

	const showMeta = quiz.status !== "setup";

	return (
		<section id="panel-quiz" className={`view${active ? " is-active" : ""}`} role="tabpanel" aria-labelledby="tab-quiz" hidden={!active}>
			{showMeta && (
				<div className="quiz-meta">
					<span>Difficulty: {capitalize(quiz.difficulty)}</span>
					<button type="button" className="link-btn" onClick={restartQuiz}>Restart</button>
				</div>
			)}

			{quiz.status === "setup" && (
				<div className="quiz-setup">
					{quiz.lastResult && (
						<p className="meta">
							Last attempt: {quiz.lastResult.correct}/{quiz.lastResult.total} correct (
							{quiz.lastResult.total ? Math.round((quiz.lastResult.correct / quiz.lastResult.total) * 100) : 0}%).
						</p>
					)}

					<p className="field-label">Difficulty</p>

					<div className="segmented" role="radiogroup" aria-label="Quiz difficulty">
						{["easy", "medium", "hard"].map((level) => (
							<button
								key={level}
								type="button"
								className={`segment${quiz.difficulty === level ? " is-active" : ""}`}
								role="radio"
								aria-checked={quiz.difficulty === level}
								onClick={() => updateQuiz((current) => ({ ...current, difficulty: level }))}
							>
								{capitalize(level)}
							</button>
						))}
					</div>

					<button type="button" className="btn btn-primary" onClick={startQuiz}>
						{quiz.lastResult ? "Take another quiz" : "Start quiz"}
					</button>
				</div>
			)}

			{quiz.status === "loading" && (
				<>
					<p className="meta">Generating your quiz…</p>
					<div className="skeleton-line" />
					<div className="skeleton-line" />
					<div className="skeleton-line" />
				</>
			)}

			{quiz.status === "error" && (
				<>
					<p className="error-state">{quiz.errorMessage || "Couldn't generate the quiz. Try again."}</p>
					<button type="button" className="btn btn-primary" disabled={loading} onClick={() => generateBatch(quiz)}>
						Try again
					</button>
				</>
			)}

			{quiz.status === "question" && quiz.batch?.[quiz.qIndex] && (() => {
				const question = quiz.batch[quiz.qIndex];
				const multiple = question.type === "multiple";
				const progress = ((quiz.qIndex + (quiz.answered ? 1 : 0)) / quiz.batch.length) * 100;

				return (
					<>
						<p className="quiz-progress-label">
							Question {quiz.qIndex + 1} of {quiz.batch.length} · Batch {quiz.batchIndex + 1}
						</p>
						<div className="quiz-progress-track">
							<div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
						</div>

						<p className="quiz-question">{question.question}</p>

						<div className="quiz-options">
							{question.options.map((optionText, index) => {
								const selected = quiz.selected.includes(index);
								let className = "quiz-option";

								if (quiz.answered) {
									if (question.correctIndexes.includes(index)) className += " is-correct";
									else if (selected) className += " is-incorrect";
								} else if (selected) {
									className += " is-selected";
								}

								return (
									<label className={className} key={`${optionText}-${index}`}>
										<input
											type={multiple ? "checkbox" : "radio"}
											name="quiz-option"
											value={index}
											checked={selected}
											disabled={quiz.answered}
											onChange={(event) =>
												selectOption(index, event.target.checked, multiple)
											}
										/>
										<span>{optionText}</span>
									</label>
								);
							})}
						</div>

						{!quiz.answered ? (
							<button
								type="button"
								className="btn btn-primary"
								disabled={!quiz.selected.length}
								onClick={submitAnswer}
							>
								Submit answer
							</button>
						) : (
							<>
								<p className={`quiz-feedback ${quiz.lastAnswerCorrect ? "is-correct-text" : "is-incorrect-text"}`}>
									{quiz.lastAnswerCorrect ? "Correct." : "Not quite."}
								</p>

								{question.explanation && (
									<p className="quiz-explanation">{question.explanation}</p>
								)}

								<button type="button" className="btn btn-primary" onClick={nextQuestion}>
									{quiz.qIndex + 1 < quiz.batch.length ? "Next question" : "See results"}
								</button>
							</>
						)}
					</>
				);
			})()}

			{quiz.status === "batch-result" && (
				<div className="quiz-result">
					<p className="quiz-score">
						{quiz.batchScore.correct} / {quiz.batchScore.total} correct this round
					</p>

					<p className="meta">
						{quiz.totalScore.correct} / {quiz.totalScore.total} correct overall (
						{quiz.totalScore.total
							? Math.round((quiz.totalScore.correct / quiz.totalScore.total) * 100)
							: 0}%)
					</p>

					<button type="button" className="btn btn-primary" onClick={() => generateBatch(quiz)}>
						Continue quiz
					</button>
					<button type="button" className="btn btn-secondary" onClick={finishQuiz}>
						Finish
					</button>
				</div>
			)}
		</section>
	);
}