import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  IsNumber,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateShiftTemplateDto {
  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'MORNING' })
  @IsString()
  code: string;

  @ApiProperty({ example: '07:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ example: '15:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be in HH:mm format' })
  endTime: string;

  @ApiProperty({ example: 8 })
  @IsNumber()
  durationHours: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHalfShift?: boolean;

  @ApiPropertyOptional({ example: '#10B981' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class CreateShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '07:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ example: '15:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be in HH:mm format' })
  endTime: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minStaff?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxStaff?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryShiftsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}

