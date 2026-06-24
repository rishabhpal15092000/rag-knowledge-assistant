import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AskQuestionDto {
  @ApiProperty({
    description: 'The question to answer from the knowledge base',
    example: 'What running shoes do you have for people with flat feet?',
  })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({
    description: 'Session ID for multi-turn conversations. Omit to start a new session.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
