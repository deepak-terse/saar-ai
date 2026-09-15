import { useLayoutEffect, useRef, useState } from "react";

const tabs = [
	{ id: "read", label: "Read" },
	{ id: "ask", label: "Ask" },
	{ id: "quiz", label: "Quiz" }
];

export const Tabs = ({ activeTab, onChange }) => {
	const refs = useRef([]);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });

	const updateIndicator = () => {
		const element = refs.current[tabs.findIndex((tab) => tab.id === activeTab)];
		const parent = element?.parentElement;
		if (!element || !parent) return;

		const rect = element.getBoundingClientRect();
		const parentRect = parent.getBoundingClientRect();
		setIndicator({
			left: rect.left - parentRect.left,
			width: rect.width,
		});
	};

	useLayoutEffect(() => {
		updateIndicator();
	}, [activeTab]);

	useLayoutEffect(() => {
		const onResize = () => updateIndicator();
		window.addEventListener("resize", onResize);
		requestAnimationFrame(updateIndicator);
		return () => window.removeEventListener("resize", onResize);
	}, [activeTab]);

	return (
		<nav className="tabs" role="tablist" aria-label="Saar AI views">
			{tabs.map((tab, index) => (
				<button
					key={tab.id}
					ref={(element) => { refs.current[index] = element; }}
					className={`tab${activeTab === tab.id ? " is-active" : ""}`}
					id={`tab-${tab.id}`}
					role="tab"
					aria-selected={activeTab === tab.id}
					aria-controls={`panel-${tab.id}`}
					onClick={() => onChange(tab.id)}
				>
					{tab.label}
				</button>
			))}
			<span
				className="tab-indicator"
				aria-hidden="true"
				style={{ left: indicator.left, width: indicator.width }}
			/>
		</nav>
	);
}