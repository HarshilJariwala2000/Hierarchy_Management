import { HttpException, Injectable, HttpStatus } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, EntityManager, EntitySchema } from 'typeorm';
import { CoreCategory } from '../entities/core.category.entity';
import { MarketplaceCategory, Marketplaces } from '../entities/marketplace.category.entity';
import { SubscribedMarketplaces, TenantCategory, TenantHierarchyLevel, TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping } from '../entities/tenant.category.entity';
import { RpcException } from '@nestjs/microservices';
import { CategoryModifyService } from './category.modify.service';

@Injectable()
export class CategoryMapService{
    constructor(
        @InjectRepository(CoreCategory, 'core') private coreCategoryRepository: Repository<CoreCategory>,
        @InjectRepository(MarketplaceCategory, 'marketplace') private marketplaceCategoryRepository: Repository<MarketplaceCategory>,
        @InjectRepository(TenantCategory, 'tenant') private tenantCategoryRepository: Repository<TenantCategory>,
        @InjectRepository(TenantHierarchyLevel, 'tenant') private tenantHierarchyLevelRepository: Repository<TenantHierarchyLevel>,
        @InjectRepository(TenantToCoreMapping, 'tenant') private tenantToCoreMappingRepository: Repository<TenantToCoreMapping>,
        @InjectRepository(TenantToMarketplaceMapping, 'tenant') private tenantToMarketplaceMappingRepository: Repository<TenantToMarketplaceMapping>,
        @InjectRepository(CoreToMarketplaceMapping, 'tenant') private coreToMarketplaceMappingRepository: Repository<CoreToMarketplaceMapping>,
        @InjectRepository(SubscribedMarketplaces, 'tenant') private subscribedMarketplacesRepository: Repository<SubscribedMarketplaces>,
        @InjectRepository(Marketplaces, 'marketplace') private marketplaceRepository: Repository<Marketplaces>,
        @InjectDataSource('core') private coreDataSource: DataSource,
        @InjectDataSource('marketplace') private marketplaceDataSource: DataSource,
        @InjectDataSource('tenant') private tenantDataSource: DataSource,
        private readonly categoryModifyService:CategoryModifyService
    ) {}

    async getTenantPath(category:TenantCategory){
        let path:string;
        path=category.category_name
        if(category.parent_id===null) return path;
    
        let parent = category
        while(parent.parent_id!=null){
            console.log(path)
            parent = await this.categoryModifyService.getTenantCategoryById(parent.parent_id, parent.tenant_id)
            path = parent.category_name+" / "+path
        }
        return path;
    }

    async getTenantToCoreMappings(tenantId:string){
        const tenantToCoreMappings = await this.tenantDataSource.getRepository(CoreToMarketplaceMapping).createQueryBuilder("coreToMarketplaceMapping").
        leftJoinAndSelect(TenantToMarketplaceMapping, "tenantToMarketplaceMapping","tenantToMarketplaceMapping.marketplaceLeafId=coreToMarketplaceMapping.marketplaceLeafId").
        where("tenantToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).getRawMany()
        console.log(tenantToCoreMappings)
    }

    async tenantToCoreMapping(tenantCategoryId:string, tenantId:string, coreCategoryId:string){
        const tenantCategory = await this.categoryModifyService.getTenantCategoryById(tenantCategoryId,tenantId)
        if(tenantCategory.is_leaf===false) throw new RpcException({message:`Only Leaf Categories can be mapped`, status:6})
        const coreCategory = await this.categoryModifyService.getCoreCategoryById(coreCategoryId)
        if(coreCategory.is_leaf===false) throw new RpcException({message:`Only Leaf Category can be Mapped`, status:6})


    }
}