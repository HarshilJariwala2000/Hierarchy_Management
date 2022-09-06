import { HttpException, Injectable, HttpStatus } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, EntityManager, EntitySchema, Not } from 'typeorm';
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

    async getTenantPath(tenantCategoryId:number, tenantId:number){
        let path:string;
        const category = await this.categoryModifyService.getTenantCategoryById(tenantCategoryId,tenantId)
        path=category.category_name
        if(category.parent_id===null) return path;
    
        let parent = category
        while(parent.parent_id!=null){
            parent = await this.categoryModifyService.getTenantCategoryById(parent.parent_id, parent.tenant_id)
            path = parent.category_name+"/"+path
        }
        return path;
    }

    async getCorePath(coreCategoryId:number){
        let path:string;
        const category = await this.categoryModifyService.getCoreCategoryById(coreCategoryId)
        path=category.category_name
        if(category.parent_id===null) return path;
    
        let parent = category
        while(parent.parent_id!=null){
            parent = await this.categoryModifyService.getCoreCategoryById(parent.parent_id)
            path = `${parent.category_name}/${path}`
        }
        return path;
    }

    async getMarketplacePath(marketplaceCategoryId:number){
        let path:string;
        const category = await this.categoryModifyService.getMarketplaceCategoryById(marketplaceCategoryId)
        path=category.category_name
        if(category.parent_id===null) return path;
    
        let parent = category
        while(parent.parent_id!=null){
            parent = await this.categoryModifyService.getMarketplaceCategoryById(parent.parent_id)
            path = `${parent.category_name}/${path}`
        }
        return path;
    }

    async getTenantToCoreMappings(tenantId:number){
        const tenantToCoreMappingsFromJoin = await this.tenantDataSource.getRepository(CoreToMarketplaceMapping).createQueryBuilder("coreToMarketplaceMapping").
        leftJoinAndSelect(TenantToMarketplaceMapping, "tenantToMarketplaceMapping","tenantToMarketplaceMapping.marketplace_leaf_id=coreToMarketplaceMapping.marketplace_leaf_id").
        where("tenantToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).
        andWhere("coreToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId})
        .getRawMany()

        const tenantToCoreMappingsFromTable = await this.tenantToCoreMappingRepository.find({where:{tenant_id:tenantId}})
        
        let tenantToCoreMappings = []

        tenantToCoreMappingsFromJoin.forEach(async(x)=>{
            tenantToCoreMappings.push({
                tenantCategoryId : x.tenantToMarketplaceMapping_tenant_category_leaf_id,
                tenant_id : x.tenantToMarketplaceMapping_tenant_id,
                coreCategoryId : x.coreToMarketplaceMapping_core_leaf_id
            })
        })

        tenantToCoreMappingsFromTable.forEach(async(x)=>{
            tenantToCoreMappings.push({
                tenantCategoryId : x.tenant_category_leaf_id,
                tenant_id:x.tenant_id,
                coreCategoryId : x.core_leaf_id
            })
        })

        return tenantToCoreMappings;

    }

    async getCoreToMarketplaceMappings(tenantId:number){
        const coreToMarketplaceMappingsFromJoin = await this.tenantDataSource.getRepository(TenantToCoreMapping).createQueryBuilder("tenantToCoreMapping").
        leftJoinAndSelect(TenantToMarketplaceMapping, "tenantToMarketplaceMapping","tenantToMarketplaceMapping.tenant_category_leaf_id=tenantToCoreMapping.tenant_category_leaf_id").
        where("tenantToCoreMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).
        andWhere("tenantToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).getRawMany()

        const coreToMarketplaceMappingsFromTable = await this.coreToMarketplaceMappingRepository.find({where:{tenant_id:tenantId}})

        let coreToMarketplaceMappings = []

        coreToMarketplaceMappingsFromJoin.forEach(async(x)=>{
            coreToMarketplaceMappings.push({
                coreCategoryId : x.tenantToCoreMapping_core_leaf_id,
                tenant_id : x.tenant_id,
                marketplaceCategoryId : x.tenantToMarketplaceMapping_marketplace_leaf_id
            })
        })

        coreToMarketplaceMappingsFromTable.forEach(async(x)=>{
            coreToMarketplaceMappings.push({
                coreCategoryId : x.core_leaf_id,
                tenant_id:x.tenant_id,
                marketplaceCategoryId:x.marketplace_leaf_id
            })
        })

        return coreToMarketplaceMappings;
    }

    // async getTenantToMarketplaceMapping(tenantId:number){
    //     const tenantToMarketplaceMappingsFromJoin = await this.tenantDataSource.getRepository(TenantToCoreMapping).createQueryBuilder("tenantToCoreMapping").
    //     leftJoinAndSelect(CoreToMarketplaceMapping, "coreToMarketplaceMapping","coreToMarketplaceMapping.core_leaf_id=tenantToCoreMapping.core_leaf_id").
    //     where("tenantToCoreMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).
    //     andWhere("coreToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).getRawMany()
        

    //     let tenantToMarketplaceMappings = []

    //     // tenantToMarketplaceMappingsFromJoin.forEach(async(x)=>{

    //     // })
    //     //Output
    //     // [
    //     //     {
    //     //       tenantToCoreMapping_tenant_id: '41c6438b-6e6f-4ee0-bdd2-e8fb3053b332',
    //     //       tenantToCoreMapping_core_leaf_id: 'c46b577a-fcb2-40e9-b8b1-255975f17f63',
    //     //       tenantToCoreMapping_tenant_category_leaf_id: 'dd57cb2d-b47c-4958-84e4-20ebbb11f60f',
    //     //       coreToMarketplaceMapping_core_leaf_id: 'c46b577a-fcb2-40e9-b8b1-255975f17f63',
    //     //       coreToMarketplaceMapping_marketplace_leaf_id: '1',
    //     //       coreToMarketplaceMapping_marketplace_name_id: 'dd323ed8-3670-465d-9f6e-d9b72ec6aa24',
    //     //       coreToMarketplaceMapping_marketplace_name: 'Amazon'
    //     //     }
    //     //   ]
    // }

    async checkDuplicatesTenantToCore(tenantCategoryLeafId:number,tenantId:number, coreCategoryLeafId:number){
        const tenantToCoreMapExist = await this.tenantDataSource.getRepository(CoreToMarketplaceMapping).createQueryBuilder("coreToMarketplaceMapping").
        leftJoinAndSelect(TenantToMarketplaceMapping, "tenantToMarketplaceMapping","tenantToMarketplaceMapping.marketplace_leaf_id=coreToMarketplaceMapping.marketplace_leaf_id").
        where("tenantToMarketplaceMapping.tenant_category_leaf_id=:tenant_category_leaf_id",{tenant_category_leaf_id:tenantCategoryLeafId}).
        andWhere("tenantToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).
        andWhere("coreToMarketplaceMapping.core_leaf_id=:core_leaf_id",{core_leaf_id:coreCategoryLeafId}).
        andWhere("coreToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).
        getOne()
        const tenantToCoreExist2 = await this.tenantToCoreMappingRepository.find({where:{tenant_category_leaf_id:tenantCategoryLeafId, core_leaf_id:coreCategoryLeafId, tenant_id:tenantId}})
        if(tenantToCoreMapExist || tenantToCoreExist2) throw new RpcException({message:`Mapping Already Exists`, status:6})
        else return false
    }

    async checkDuplicatesTenantToMarketplace(tenantCategoryLeafId:number, tenantId:number, marketplaceCategoryLeafId:number){
        const tenantToMarketplaceMapExist = await this.tenantDataSource.getRepository(TenantToCoreMapping).createQueryBuilder("tenantToCoreMapping").
        leftJoinAndSelect(CoreToMarketplaceMapping, "coreToMarketplaceMapping","coreToMarketplaceMapping.core_leaf_id=tenantToCoreMapping.core_leaf_id").
        where("tenantToCoreMapping.tenant_category_leaf_id=:tenant_category_leaf_id",{tenant_category_leaf_id:tenantCategoryLeafId}).
        andWhere("tenantToCoreMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).
        andWhere("coreToMarketplaceMapping.marketplace_leaf_id=:marketplace_leaf_id",{marketplace_leaf_id:marketplaceCategoryLeafId}).
        andWhere("coreToMarketplaceMapping.tenant_id=:tenant_id",{tenant_id:tenantId}).
        getMany()
        const tenantToMarketplaceExist2 = await this.tenantToMarketplaceMappingRepository.find({where:{tenant_category_leaf_id:tenantCategoryLeafId, tenant_id:tenantId, marketplace_leaf_id:marketplaceCategoryLeafId}})
        if(tenantToMarketplaceMapExist||tenantToMarketplaceExist2) throw new RpcException({message:`Mapping Already Exists`, status:6})
    }

    async checkDuplicatesCoreToMarketplace(coreCategoryId:number, tenantId:number, marketplaceCategoryId:number){
        const coreToMarketplaceExist = await this.tenantDataSource.getRepository(TenantToCoreMapping).createQueryBuilder("tenantToCoreMapping").
        leftJoinAndSelect(TenantToMarketplaceMapping, "tenantToMarketplaceMapping","tenantToMarketplaceMapping.category_leaf_id=tenantToCoreMapping.category_leaf_id").
        where("tenantToCoreMapping.core_leaf_id=:core_leaf_id",{core_leaf_id:coreCategoryId}).
        andWhere("tenantToCoreMapping.core_leaf_id=:tenant_id",{tenant_id:tenantId}).
        andWhere("tenantToMarketplaceMapping.marketplace_leaf_id=:marketplace_leaf_id",{marketplace_leaf_id:marketplaceCategoryId}).
        andWhere("tenantToMarketplaceMapping.tenant_id",{tenant_id:tenantId}).
        getMany()
        const coreToMarketplaceExist2 = await this.coreToMarketplaceMappingRepository.find({where:{core_leaf_id:coreCategoryId, tenant_id:tenantId, marketplace_leaf_id:marketplaceCategoryId}})
        if(coreToMarketplaceExist||coreToMarketplaceExist2) throw new RpcException({message:`Mapping Already Exists`, status:6})
    }

    async tenantToCoreMapping(tenantCategoryId:number, tenantId:number, coreCategoryId:number){

        const tenantCategory = await this.categoryModifyService.getTenantCategoryById(tenantCategoryId,tenantId)
        if(tenantCategory.is_leaf===false) throw new RpcException({message:`Only Leaf Categories can be mapped`, status:6})

        const coreCategory = await this.categoryModifyService.getCoreCategoryById(coreCategoryId)
        if(coreCategory.is_leaf===false) throw new RpcException({message:`Only Leaf Category can be Mapped`, status:6})

        await this.checkDuplicatesTenantToCore(tenantCategoryId,tenantId,coreCategoryId)

        await this.tenantToCoreMappingRepository.save({
            tenant_category_leaf_id:tenantCategoryId,
            tenant_id:tenantId,
            core_leaf_id:coreCategoryId
        })
    }

    async coreToMarketplaceMapping(coreCategoryId:number, tenantId:number, marketplaceCategoryId:number){
        const coreCategory = await this.categoryModifyService.getCoreCategoryById(coreCategoryId)
        if(coreCategory.is_leaf===false) throw new RpcException({message:`Only Leaf Category can be Mapped`, status:6})

        const marketplaceCategory = await this.categoryModifyService.getMarketplaceCategoryById(marketplaceCategoryId)
        if(marketplaceCategory.is_leaf===false) throw new RpcException({message:`Only Leaf Category can be Mapped`, status:6})

        await this.checkDuplicatesCoreToMarketplace(coreCategoryId, tenantId, marketplaceCategoryId)

        await this.coreToMarketplaceMappingRepository.save({
            tenant_id:tenantId,
            core_leaf_id:coreCategoryId,
            marketplace_leaf_id:marketplaceCategoryId,
            marketplace_name_id:marketplaceCategory.marketplace.marketplace_name_id,
            marketplace_name:marketplaceCategory.marketplace.marketplace_name
        })
    }

    async displayMappedCategories(tenantId:number){
        const tenantToCoreMappings = await this.getTenantToCoreMappings(tenantId)

        let displayMappedCategory = []

        for(let i = 0 ; i < tenantToCoreMappings.length ; i++){
            const tenantPath = await this.getTenantPath(tenantToCoreMappings[i].tenantCategoryId, tenantToCoreMappings[i].tenant_id)
            const corePath = await this.getCorePath(tenantToCoreMappings[i].coreCategoryId)
            displayMappedCategory.push({
                merchandisingCategory:tenantPath.slice(0,tenantPath.indexOf('/')),
                hierarchy:tenantPath.slice(tenantPath.indexOf('/')+1),
                coreRoot:corePath.slice(0,corePath.indexOf('/')),
                mappedWithCore:corePath,
                mappedOn:''
            })
        }
        
        return displayMappedCategory;

    }

    async displayMappedChannels(tenantId:number){
        const coreToMarketplaceMappings = await this.getCoreToMarketplaceMappings(tenantId)

        let displayMappedChannel = []

        for(let i = 0 ; i < coreToMarketplaceMappings.length ; i++){
            const corePath = await this.getCorePath(coreToMarketplaceMappings[i].coreCategoryId)
            const marketplacePath = await this.getMarketplacePath(coreToMarketplaceMappings[i].marketplaceCategoryId)
            const marketplaceCategory = await this.categoryModifyService.getMarketplaceCategoryById(coreToMarketplaceMappings[i].marketplaceCategoryId)
            displayMappedChannel.push({
                mappedCoreCategory:corePath,
                mappedChannel:marketplaceCategory.marketplace_name,
                channelCategory:marketplacePath.slice(0,marketplacePath.indexOf('/')), 
                channelHierarchy:marketplacePath.slice(marketplacePath.indexOf('/')+1),
                mappedOn:'',
                status:true
            })
        }

        return displayMappedChannel;
    }

    async displayUnmappedCategories(tenantId:number){
        const tenantToCoreMappings = await this.getTenantToCoreMappings(tenantId)
        const mappedIds:number[] = tenantToCoreMappings.map(x=>x.tenantCategoryId)
        // const unmappedIds = await this.tenantCategoryRepository.find({where:{tenant_category_id:Not(mappedIds)}})
        const allCategoryIds =  (await this.tenantCategoryRepository.find({where:{tenant_id:tenantId, is_leaf:true}})).map(x=>x.tenant_category_id)
        const unmappedIds = allCategoryIds.filter(x=>!mappedIds.includes(x))
        let unmappedCategory = [];
        for(let i = 0 ; i < unmappedIds.length ; i++){
            const tenantPath = await this.getTenantPath(unmappedIds[i], tenantId)
            unmappedCategory.push({
                merchandisingCategory:tenantPath.slice(0,tenantPath.indexOf('/')),
                hierarchy:tenantPath.slice(tenantPath.indexOf('/')+1),
            })
        }
        return unmappedCategory;
    }

    async displayUnmappedChannels(tenantId:number){
        const coreToMarketplaceMappings = await this.getCoreToMarketplaceMappings(tenantId)
        const mappedIds:number[] = coreToMarketplaceMappings.map(x=>x.coreCategoryId)
        const allCoreCategoryIds = (await this.coreCategoryRepository.find({where:{is_leaf:true}})).map(x=>x.core_category_id)
        const unmappedIds = allCoreCategoryIds.filter(x=>!mappedIds.includes(x))
        const subscribedMarketplaces = await this.subscribedMarketplacesRepository.find({where:{tenant_id:tenantId}})
        let unmappedCoreCategory = []
        for(let i = 0;i<subscribedMarketplaces.length; i++){
            for(let j=0;j<unmappedIds.length;j++){
                const corePath = await this.getCorePath(unmappedIds[j])
                unmappedCoreCategory.push({
                    unmappedCoreCategory:corePath,
                    channel:subscribedMarketplaces[i].marketplace_name,
                    channelId:subscribedMarketplaces[i].marketplace_name_id
                })

            }
        }

        return unmappedCoreCategory;
    }



    
}