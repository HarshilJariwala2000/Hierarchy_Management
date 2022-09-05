import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryModifyService } from './category.modify.service';
import {MarketplaceCategory, Marketplaces} from '../entities/marketplace.category.entity';
import { TenantCategory, SubscribedMarketplaces, TenantHierarchyLevel,  TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping} from '../entities/tenant.category.entity'
import { TypeOrmModule } from '@nestjs/typeorm';
import {CoreCategory} from '../entities/core.category.entity';
import { CategoryMapService } from './category.map.service';

@Module({
  imports:[
    TypeOrmModule.forFeature([CoreCategory],'core'),
    TypeOrmModule.forFeature([MarketplaceCategory, Marketplaces],'marketplace'),
    TypeOrmModule.forFeature([ TenantCategory, SubscribedMarketplaces, TenantHierarchyLevel,  TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping],'tenant'),
  ],
  controllers: [CategoryController],
  providers: [CategoryModifyService, CategoryMapService]
})
export class CategoryModule {}
