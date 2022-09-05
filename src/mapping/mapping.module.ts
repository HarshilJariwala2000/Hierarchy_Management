import { Module } from '@nestjs/common';
import { MappingController } from './mapping.controller';
import { MappingService } from './mapping.service';
import {CoreCategory} from '../entities/core.category.entity';
import {MarketplaceCategory, Marketplaces} from '../entities/marketplace.category.entity';
import { TenantCategory, SubscribedMarketplaces, TenantHierarchyLevel,  TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping} from '../entities/tenant.category.entity'
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports:[
    TypeOrmModule.forFeature([CoreCategory],'core'),
    TypeOrmModule.forFeature([MarketplaceCategory, Marketplaces],'marketplace'),
    TypeOrmModule.forFeature([ TenantCategory, SubscribedMarketplaces, TenantHierarchyLevel,  TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping],'tenant'),
  ],
  controllers: [MappingController],
  providers: [MappingService]
})
export class MappingModule {}
