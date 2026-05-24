import { loadJson } from "@/lib/storage";
import type { ConsensusPublishState } from "./types";

export const CONSENSUS_KEY = "nestle_dp_consensus";

export function getConsensusStates(): ConsensusPublishState[] {
  return loadJson<ConsensusPublishState[]>(CONSENSUS_KEY, []);
}

export function getConsensusState(skuCode: string): ConsensusPublishState | null {
  return getConsensusStates().find((s) => s.skuCode === skuCode) ?? null;
}

export function isForecastPublished(skuCode: string): boolean {
  if (!skuCode) return false;
  return getConsensusState(skuCode)?.published === true;
}
