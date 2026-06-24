import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConversationService } from './conversation.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: async (configService: ConfigService) => {
        const { Pool } = await import('pg');
        const pool = new Pool({
          host: configService.get('postgres.host'),
          port: configService.get('postgres.port'),
          database: configService.get('postgres.database'),
          user: configService.get('postgres.user'),
          password: configService.get('postgres.password'),
        });
        return pool;
      },
      inject: [ConfigService],
    },
    ConversationService,
  ],
  exports: [ConversationService],
})
export class ConversationModule {}
