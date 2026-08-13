/**
 * Connector registry. SAP and Salesforce are implemented in Phase 3
 * against the live sandboxes, configured by the founder through the
 * product's own setup UI (credentials never travel out-of-band).
 */
import type { Connector } from "@/connectors/types";
import type { ConnectorId } from "@/core/types";

const registry = new Map<ConnectorId, Connector>();

export function getConnector(id: ConnectorId): Connector | null {
  return registry.get(id) ?? null;
}

export function listConnectorIds(): ConnectorId[] {
  return [...registry.keys()];
}

export function registerConnector(connector: Connector): void {
  registry.set(connector.id, connector);
}
