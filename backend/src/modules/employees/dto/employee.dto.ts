import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty()
  @IsUUID()
  roleId: string;

  @ApiProperty()
  @IsUUID()
  typeId: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  joinDate: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  seniorityLevel?: number;

  @ApiPropertyOptional({ example: 'morning' })
  @IsOptional()
  @IsString()
  preferredShift?: string;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  maxHoursPerWeek?: number;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  typeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  seniorityLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredShift?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  maxHoursPerWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryEmployeesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  typeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: 'morning' })
  @IsOptional()
  @IsString()
  preferredShift?: string;

  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(60)
  maxHoursPerWeek?: number;
}

