import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";
import { createWritableIterable } from "@connectrpc/connect/protocol";
import { expect, it, vi } from "vitest";

import {
  ServiceStatusSchema,
  StartedService,
  ServiceStatus_Type,
  type ServiceStatus,
} from "../gen/daemon/started_service_pb";
import { DaemonApi } from "./daemon";

it("keeps the last stable service status through a reload and clears it when the service stops", async () => {
  const messages = createWritableIterable<ServiceStatus>();
  const transport = createRouterTransport((router) => {
    router.rpc(StartedService.method.subscribeServiceStatus, () => messages);
  });
  const api = new DaemonApi({ id: "test", name: "test", url: "", secret: "" }, "en", transport);
  const unsubscribe = api.serviceStatus.subscribe(() => {});
  const { STARTING, STARTED, STOPPING, IDLE, FATAL } = ServiceStatus_Type;
  const statuses = [
    [STARTING, null],
    [STARTED, STARTED],
    [STOPPING, STARTED],
    [STARTING, STARTED],
    [STARTED, STARTED],
    [STOPPING, STARTED],
    [IDLE, IDLE],
    [STARTING, IDLE],
    [FATAL, FATAL],
  ] as const;

  try {
    for (const [status, lastStableStatus] of statuses) {
      await messages.write(create(ServiceStatusSchema, { status }));
      await vi.waitFor(() => {
        expect(api.serviceStatus.getSnapshot().data).toMatchObject({
          status: { status },
          lastStableStatus,
        });
      });
    }
  } finally {
    unsubscribe();
    messages.close();
  }
});
