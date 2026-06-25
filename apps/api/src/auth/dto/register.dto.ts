import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Merchant Info DTO
 * Nested DTO for merchant information during registration
 */
export class MerchantInfoDto {
  @ApiProperty({
    description: 'Unique slug for the merchant',
    example: 'my-company',
  })
  @IsString()
  @IsNotEmpty({ message: 'Merchant slug is required' })
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Merchant slug must only contain lowercase letters, numbers and hyphens',
  })
  slug: string;

  @ApiProperty({
    description: 'Merchant name',
    example: 'My Company',
  })
  @IsString()
  @IsNotEmpty({ message: 'Merchant name is required' })
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Merchant phone number',
    example: '08123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Merchant address',
    example: 'Jl. Ahmad Yani No. 123',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Merchant logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  logo?: string;
}

/**
 * Register DTO
 * Used for new user registration with merchant creation
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    description: 'Merchant information',
    type: MerchantInfoDto,
  })
  @ValidateNested()
  @Type(() => MerchantInfoDto)
  @IsNotEmpty({ message: 'Merchant information is required' })
  merchant: MerchantInfoDto;
}
