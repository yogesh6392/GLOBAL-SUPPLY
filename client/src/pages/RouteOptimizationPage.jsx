import { useState } from "react";
import api from "../api";
import { getDemoRouteNetwork, optimizeDemoRoute } from "../demoApi";
import {
  Notice,
  PageHeader,
  SectionCard,
  useApiResource
} from "../components/ResourceHelpers";

export default function RouteOptimizationPage() {
  const network = useApiResource("/optimization/network");
  const [form, setForm] = useState({ origin: "", destination: "", costPerDistance: "1" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [usingOfflineFallback, setUsingOfflineFallback] = useState(false);
  const networkData = network.data ?? (network.error ? getDemoRouteNetwork() : null);
  const usingLocalNetwork = !network.data && Boolean(network.error);
  const vertices = networkData?.vertices ?? [];

  async function calculate(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setRunning(true);
    try {
      if (usingLocalNetwork) {
        setResult(optimizeDemoRoute({
          ...form,
          costPerDistance: Number(form.costPerDistance)
        }));
        setUsingOfflineFallback(true);
        return;
      }

      const { data } = await api.post("/optimization/route", {
        ...form,
        costPerDistance: Number(form.costPerDistance)
      });
      setResult(data.data);
      setUsingOfflineFallback(false);
    } catch (requestError) {
      if (!requestError.response) {
        setResult(optimizeDemoRoute({
          ...form,
          costPerDistance: Number(form.costPerDistance)
        }));
        setUsingOfflineFallback(true);
      } else {
        setError(requestError.response.data?.message ?? "Could not calculate sample route.");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="ROUTE PLANNING" title="Route optimization" description="Explore Dijkstra's shortest path on a small, clearly-labelled demonstration network." />
      {(usingLocalNetwork || usingOfflineFallback) && <Notice>API unavailable; using the browser's local sample network and route calculation.</Notice>}
      {network.error && !usingLocalNetwork && <Notice tone="error">{network.error}</Notice>}
      <div className="split-layout route-layout">
        <SectionCard title="Plan a demonstration route" description="Choose two network locations and an illustrative cost per sample distance unit.">
          <form className="compact-form" onSubmit={calculate}>
            <label htmlFor="route-origin">Origin</label><select id="route-origin" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} required><option value="">Choose origin</option>{vertices.map((vertex) => <option key={vertex}>{vertex}</option>)}</select>
            <label htmlFor="route-destination">Destination</label><select id="route-destination" value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} required><option value="">Choose destination</option>{vertices.map((vertex) => <option key={vertex}>{vertex}</option>)}</select>
            <label htmlFor="route-cost">Illustrative cost per distance unit</label><input id="route-cost" type="number" min="0" step="any" value={form.costPerDistance} onChange={(event) => setForm({ ...form, costPerDistance: event.target.value })} required />
            <button className="button button-primary" disabled={running || network.loading}>{running ? "Calculating…" : "Calculate shortest route"}</button>
          </form>
        </SectionCard>
        <SectionCard title="Sample network" description={networkData?.networkAssumption ?? "Loading sample network."}>
          <div className="route-edges">{(networkData?.edges ?? []).map((edge, index) => <div className="route-edge" key={`${edge.from}-${edge.to}-${index}`}><span>{edge.from}</span><span className="edge-distance">{edge.distance} sample units</span><span>{edge.to}</span></div>)}</div>
        </SectionCard>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {result && <SectionCard title="Calculated route" description={result.complexity}>
        <div className="route-result"><div className="route-path">{result.route.map((point, index) => <span key={`${point}-${index}`}>{index > 0 && <b aria-hidden="true">→</b>}{point}</span>)}</div><div className="route-total"><strong>{result.distance}</strong><span>{result.unit}</span></div><div className="route-total"><strong>{result.estimatedCost}</strong><span>illustrative cost</span></div></div>
        <Notice>{result.networkAssumption} No live traffic, road network, carrier rate or GPS source is connected.</Notice>
      </SectionCard>}
    </div>
  );
}
