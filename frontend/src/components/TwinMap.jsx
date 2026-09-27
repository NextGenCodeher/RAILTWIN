import { Fragment, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Popup, useMap } from "react-leaflet";
import { BAND, DEPT_COLOR, minOfDay, hhmm, dmy } from "../lib/ui";

/**
 * Track twin: the real corridors on a map.
 *  - dots on the track  = open works / defects (colour = AI priority, size = criticality)
 *  - thick coloured line = section under block at the simulation clock
 *  - small dark circles  = trains running at the simulation clock (from the time table)
 */
const RADIUS = { Critical: 8, High: 6.5, Medium: 5, Low: 4 };

function along(path, t) {
  const x = Math.min(Math.max(t, 0), 1) * (path.length - 1);
  const i = Math.min(Math.floor(x), path.length - 2);
  const f = x - i;
  return [path[i][0] + f * (path[i + 1][0] - path[i][0]), path[i][1] + f * (path[i + 1][1] - path[i][1])];
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 12, { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function TwinMap({ network, day, clock, blocks, trains, works, focus, onSelectBlock, height = 480 }) {
  const bySection = useMemo(() => Object.fromEntries(network.map((s) => [s.section, s])), [network]);
  const bounds = useMemo(() => network.flatMap((s) => [...s.up, ...s.down]), [network]);

  const activeBlocks = blocks.filter((b) => minOfDay(b.start, day) <= clock && clock < minOfDay(b.end, day));
  const activeTasks = new Set(
    activeBlocks.flatMap((b) => b.tasks.filter((t) => minOfDay(t.planned_start, day) <= clock && clock < minOfDay(t.planned_end, day)).map((t) => t.id))
  );

  const runningTrains = trains
    .filter((t) => minOfDay(t.start, day) <= clock && clock < minOfDay(t.end, day))
    .map((t) => {
      const s = bySection[t.section];
      if (!s) return null;
      const a = minOfDay(t.start, day), b = minOfDay(t.end, day);
      const f = (clock - a) / Math.max(b - a, 1);
      const path = t.line === "Up" ? s.up : s.down;
      return { ...t, pos: along(path, t.direction === "Increasing KM" ? f : 1 - f) };
    })
    .filter(Boolean);

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-200" style={{ height }}>
      <MapContainer bounds={bounds} preferCanvas style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FlyTo target={focus} />

        {network.map((s) => (
          <Fragment key={s.section}>
            <Polyline positions={s.up} pathOptions={{ color: "#334155", weight: 2.5 }}>
              <Tooltip sticky>{s.section} Up · {s.name}</Tooltip>
            </Polyline>
            <Polyline positions={s.down} pathOptions={{ color: "#64748b", weight: 2.5 }}>
              <Tooltip sticky>{s.section} Down · {s.name}</Tooltip>
            </Polyline>
          </Fragment>
        ))}

        {/* sections under block right now */}
        {activeBlocks.map((b) => {
          const s = bySection[b.section];
          const lines = b.line === "Both Lines" ? ["up", "down"] : [b.line.toLowerCase()];
          return lines.map((ln) => (
            <Polyline
              key={b.id + ln}
              positions={s[ln]}
              eventHandlers={{ click: () => onSelectBlock?.(b) }}
              pathOptions={{ color: DEPT_COLOR[b.departments[0]], weight: 9, opacity: 0.55, dashArray: b.status === "APPROVED" ? null : "10 8" }}
            >
              <Tooltip sticky>
                <b>{b.id}</b> blocked {hhmm(b.start)}–{hhmm(b.end)} · {b.departments.join(" + ")}
              </Tooltip>
            </Polyline>
          ));
        })}

        {/* stations */}
        {network.flatMap((s) => s.stations).map((st, i) => (
          <CircleMarker key={st.name + i} center={[st.lat, st.lon]} radius={3.5} pathOptions={{ color: "#0f172a", weight: 1.5, fillColor: "#fff", fillOpacity: 1 }}>
            <Tooltip direction="right" offset={[6, 0]}>{st.name}</Tooltip>
          </CircleMarker>
        ))}

        {/* works / defects */}
        {works.map((w) => {
          const live = activeTasks.has(w.id);
          return (
            <CircleMarker
              key={w.id}
              center={[w.lat, w.lon]}
              radius={RADIUS[w.priority_band] + (live ? 4 : 0)}
              pathOptions={{ color: live ? "#0f172a" : "#fff", weight: live ? 3 : 1, fillColor: BAND[w.priority_band].color, fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="text-xs space-y-0.5 min-w-52">
                  <div className="font-semibold text-sm">{w.work_description}</div>
                  <div>{w.id} · {w.department} · {w.work_type}</div>
                  <div>{w.asset_type} {w.asset_id} · {w.section} {w.line} · km {w.km_start?.toFixed(2)}</div>
                  <div>Priority: <b>{w.priority_band}</b> ({Math.round(w.priority_score)}) – {w.reasons.join(", ")}</div>
                  <div>Status: <b>{w.status}</b>{w.planned_start ? ` · block ${dmy(w.planned_start)} ${hhmm(w.planned_start)}–${hhmm(w.planned_end)}` : ` · ${w.plan_note || "not yet planned"}`}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {runningTrains.map((t) => (
          <CircleMarker key={t.id} center={t.pos} radius={5} pathOptions={{ color: "#fff", weight: 1.5, fillColor: t.type === "Goods" ? "#78350f" : "#0f172a", fillOpacity: 1 }}>
            <Tooltip>{t.id} · {t.type} · {t.section} {t.line} · {hhmm(t.start)}–{hhmm(t.end)}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute bottom-2 left-2 z-[500] bg-white/95 rounded-md border border-slate-200 px-2.5 py-2 text-[11px] space-y-1">
        <div className="flex items-center gap-3">
          {Object.entries(BAND).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />{k}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-900" />Train</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-900" />Goods</span>
          <span className="flex items-center gap-1"><span className="w-4 h-1.5 bg-blue-600/60 rounded" />Section under block</span>
        </div>
      </div>
      <div className="absolute top-2 right-2 z-[500] bg-white/95 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px]">
        {runningTrains.length} trains running · {activeBlocks.length} blocks active
      </div>
    </div>
  );
}
