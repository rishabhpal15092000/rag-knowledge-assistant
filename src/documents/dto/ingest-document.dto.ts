import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum DocumentType {
  PRODUCT = 'product',
  FAQ = 'faq',
  POLICY = 'policy',
  GENERAL = 'general',
}

export class IngestDocumentDto {
  @ApiProperty({ description: 'Document title', example: 'Dental Products Catalog' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Full text content of the document' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Source reference (URL or file path)', example: 'catalog-2024.pdf' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ enum: DocumentType, default: DocumentType.GENERAL })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}
