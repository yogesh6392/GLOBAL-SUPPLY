import { useEffect, useMemo, useState } from "react";
import api from "../api";
import {
  Notice,
  PageHeader,
  SectionCard,
  useApiResource
} from "../components/ResourceHelpers";

const units = [
  ["unit-1", "Unit 1 · Trees & heaps"],
  ["unit-2", "Unit 2 · Graph algorithms"],
  ["unit-3", "Unit 3 · Dynamic programming"],
  ["unit-4", "Unit 4 · Backtracking & exact search"],
  ["unit-5", "Unit 5 · Advanced data structures"]
];

export default function AlgorithmLabPage() {
  const catalog = useApiResource("/algorithms");
  const [unit, setUnit] = useState("unit-1");
  const [algorithm, setAlgorithm] = useState("");
  const [input, setInput] = useState("{}");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const entries = useMemo(() => Object.entries(catalog.data?.algorithms ?? {}), [catalog.data]);
  const choices = entries.filter(([, item]) => item.unit === unit);
  const selected = catalog.data?.algorithms?.[algorithm];

  useEffect(() => {
    if (choices.length && !choices.some(([id]) => id === algorithm)) setAlgorithm(choices[0][0]);
  }, [choices, algorithm]);

  useEffect(() => {
    if (selected) setInput(JSON.stringify(selected.sampleInput, null, 2));
  }, [selected]);

  async function run() {
    setError("");
    setResult(null);
    setRunning(true);
    try {
      const parsedInput = JSON.parse(input);
      const { data } = await api.post("/algorithms/run", { algorithm, input: parsedInput });
      setResult(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? (requestError instanceof SyntaxError ? "Enter valid JSON before running the algorithm." : "The algorithm could not be run."));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="DESIGN & ANALYSIS OF ALGORITHMS" title="DAA algorithm laboratory" description="Run bounded JavaScript demonstrations from the five syllabus units. Outputs explain their complexity; business examples remain models, not forecasts." />
      {catalog.error && <Notice tone="error">{catalog.error}</Notice>}
      <div className="algo-layout">
        <SectionCard title="Choose a demonstration" description="Each algorithm has a sample input and a documented input limit.">
          <label className="field-label" htmlFor="algo-unit">Syllabus unit</label>
          <select id="algo-unit" value={unit} onChange={(event) => setUnit(event.target.value)}>{units.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <label className="field-label" htmlFor="algo-id">Algorithm</label>
          <select id="algo-id" value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}>{choices.map(([id, item]) => <option value={id} key={id}>{id} · {item.description}</option>)}</select>
          {selected && <div className="algorithm-explainer"><strong>Purpose</strong><p>{selected.description}</p><strong>Complexity</strong><p>{selected.complexity}</p><strong>Result shape</strong><p className="code-copy">{selected.resultShape}</p></div>}
        </SectionCard>
        <SectionCard title="Algorithm input" description="Edit the JSON sample, then run it. Invalid input returns a clear error.">
          <label className="field-label" htmlFor="algo-input">Sample input (JSON)</label>
          <textarea id="algo-input" className="code-editor" spellCheck="false" value={input} onChange={(event) => setInput(event.target.value)} rows="14" />
          {error && <Notice tone="error">{error}</Notice>}
          <button className="button button-primary algo-run" onClick={run} disabled={running || !algorithm}>{running ? "Running…" : "Run demonstration"} <span aria-hidden="true">→</span></button>
        </SectionCard>
      </div>
      <SectionCard title="Result" description={result ? `${result.algorithm} · ${result.unit} · ${result.complexity}` : "The result appears here after an algorithm runs."}>
        {result ? <pre className="code-output">{JSON.stringify(result.result, null, 2)}</pre> : <div className="empty-state">Choose an algorithm, inspect its input and run a demonstration.</div>}
      </SectionCard>
      <SectionCard title="Available implementations" description="Includes implementation notes and complexity metadata for every item.">
        <div className="algorithm-list">{choices.map(([id, item]) => <article key={id}><strong>{id}</strong><span>{item.description}</span><small>{item.complexity}</small></article>)}</div>
      </SectionCard>
    </div>
  );
}
