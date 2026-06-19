import { QueueJobKeys } from "@/src/common/enums/queue-job.enum";
import { BullModule } from "@nestjs/bull";
import { forwardRef, Module } from "@nestjs/common";

@Module({
  providers: [],
  imports: [
    BullModule.registerQueue({ name: QueueJobKeys.LISTEN_TRANSACTIONS }),
    BullModule.registerQueue({ name: QueueJobKeys.LISTEN_POOLS }),
    BullModule.registerQueue({ name: QueueJobKeys.LISTEN_LIQUIDITY_EVENTS }),
    BullModule.registerQueue({ name: QueueJobKeys.LISTEN_COLLECT_FEES }),
    BullModule.registerQueue({ name: QueueJobKeys.LISTEN_PROTOCOL_FEES }),
  ],
})
export class JobProcessorModule {}
