import { HttpException, Injectable, HttpStatus } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, EntityManager, EntitySchema } from 'typeorm';
import { CoreCategory } from '../entities/core.category.entity';
import { MarketplaceCategory, Marketplaces } from '../entities/marketplace.category.entity';
import { SubscribedMarketplaces, TenantCategory, TenantHierarchyLevel, TenantToCoreMapping, CoreToMarketplaceMapping, TenantToMarketplaceMapping } from '../entities/tenant.category.entity';
import uuid from 'uuid';
import * as excelReader from 'xlsx'
import * as path from 'path'
import { RpcException } from '@nestjs/microservices';
const ADDLEVEL:string = "addLevel"
const ADDSIBLING:string = "addSibling"
const CORE = "core"
const MARKETPLACE = "marketplace"
const TENANT = "tenant"
@Injectable()
export class CategoryModifyService {
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
    ) {}

    async getTenantCategoryById(tenantCategoryid:string, tenantId:string){
        try{
        const tenantCategory = await this.tenantCategoryRepository.findOne({where:{tenant_category_id:tenantCategoryid, tenant_id:tenantId}, relations:{children:true,parent:true}})
        if(!tenantCategory) throw new RpcException({message:"Category does not exist",status:5})
        else return tenantCategory
        }catch(error){
            throw new RpcException({message:error.message,status:error.status})
        }
    }

    async getCoreCategoryById(coreCategoryid:string){
        try{
            const coreCategory = await this.coreCategoryRepository.findOne({where:{core_category_id:coreCategoryid}, relations:{children:true,parent:true}})
            if(!coreCategory) throw new RpcException({message:"Category does not exist",status:5})
            else return coreCategory
            }catch(error){
                throw new RpcException({message:error.message,status:error.status})
            }
    }

    async getMarketplaceCategoryById(marketplaceCategoryid:string){
        try{
            const marketplaceCategory = await this.marketplaceCategoryRepository.findOne({where:{marketplace_category_id:marketplaceCategoryid}, relations:{children:true,parent:true}})
            if(!marketplaceCategory) throw new RpcException({message:"Category does not exist",status:5})
            else return marketplaceCategory
            }catch(error){
                throw new RpcException({message:error.message,status:error.status})
            }
    }

    async canAddLevel(depth:number, tenantId:string){
        const levelLimit = await this.tenantHierarchyLevelRepository.findOne({ where: { tenant_id:tenantId } })
        if (depth + 1 >= levelLimit.level) return false
        else return true
    }

    async saveCategory(entityManager:EntityManager, tenantId:string, categoryName:string, parent:TenantCategory | string, depth?:number, isLeaf?:boolean){
        const category = new TenantCategory()
        category.category_name = categoryName
        category.tenant_id = tenantId
        if(typeof parent === 'string') category.parent_id = parent
        if(typeof parent === 'object') category.parent = parent
        if(depth!=undefined) category.depth = depth
        if(isLeaf!=undefined) category.is_leaf = isLeaf
        return await entityManager.getRepository(TenantCategory).save(category)
    }

    async check(){
        const x = [];
        console.log(x)
        if(x) throw new HttpException('jf',404)
        else return "hi"
    }

    async changeIsLeafToFalse(entityManager:EntityManager, category:TenantCategory){
        if(category.is_leaf===true){
            category.is_leaf = false;
            return await entityManager.getRepository(TenantCategory).save(category)
        }
    }

    async duplicateCheck(category:TenantCategory, categoryNameToBeAdded:string, functionName:string){
        if(functionName===ADDLEVEL){
            const duplicates = category.children.filter(x => x.category_name === categoryNameToBeAdded)
            if(duplicates.length!=0) throw new RpcException({message:`${categoryNameToBeAdded} already exists`,status:6})
        }
        if(functionName===ADDSIBLING){
            if(category.parent_id===null){
                const duplicates = await this.tenantCategoryRepository.find({where:{category_name:categoryNameToBeAdded, tenant_id:category.tenant_id, parent_id:null}})
                if(duplicates.length!=0) throw new RpcException({message:`${categoryNameToBeAdded} already Exist`,status:6}) 
            }else{
                const parent = await this.getTenantCategoryById(category.parent_id,category.tenant_id)
                console.log(parent)
                const duplicateSiblings = parent.children.filter(x => x.category_name === categoryNameToBeAdded) 
                if(duplicateSiblings.length!=0) throw new RpcException({message:`${categoryNameToBeAdded} already Exist`,status:6}) 
            }
        }
    }

    async addLevel(tenantCategoryid:string, tenantId:string, categoryName:string){
        const category:TenantCategory = await this.getTenantCategoryById(tenantCategoryid, tenantId)
        if(!await this.canAddLevel(category.depth, tenantId)) throw new RpcException({message:`Hierarchy Limit Reached`, status:7})
        await this.duplicateCheck(category,categoryName,ADDLEVEL)

        await this.tenantDataSource.manager.transaction(async(entityManager)=>{
            // Write code to transfer attributes, workflow and mappings to new Leaf Node created
            await this.changeIsLeafToFalse(entityManager, category)
            await this.saveCategory(entityManager, tenantId, categoryName, category.tenant_category_id, category.depth+1, true)
        })
    }

    async addSibling(tenantCategoryid:string, tenantId:string, categoryName:string){
        const category = await this.getTenantCategoryById(tenantCategoryid,tenantId)
        await this.duplicateCheck(category,categoryName,ADDSIBLING)
        await this.saveCategory(this.tenantDataSource.createEntityManager(), tenantId,categoryName,category.parent,category.depth,true)
    }

    async generateDepthData(entityManager:EntityManager, category:TenantCategory, toUpdate:{update:boolean}){
        let depth = 0;
        if(category.parent_id===null)  depth=0
        else{
            let parent = category
            while (parent.parent_id != null) {
                parent = await this.getTenantCategoryById(parent.parent_id,parent.tenant_id)
                depth++
            }
        }
        if(toUpdate.update===true){
            category.depth = depth
            await entityManager.getRepository(TenantCategory).save(category)
        }
        return depth;  
    }

    async maxCategoryDepth(tenantId:string){
        const depth = await this.tenantDataSource.getRepository(TenantCategory).createQueryBuilder('tenantCategory').where("tenantCategory.tenant_id=:id",{id:tenantId}).select("MAX(tenantCategory.depth)","max").getRawOne()
        return depth.max
    }

    async updateHierarchyLevel(level:number, tenantId:string){
        const maxTenantLevel = await this.maxCategoryDepth(tenantId)
        if(maxTenantLevel>level) throw new RpcException({message:`Tenant already have maximum level of ${maxTenantLevel.max+1}`,status:9})
        const tenantHierarchyLevel:TenantHierarchyLevel = {tenant_id:tenantId,level:level}
        await this.tenantHierarchyLevelRepository.save(tenantHierarchyLevel)
        
    }

    async subscribeToMarketplaces(marketplaceNameId:string, tenantId:string){
        const marketplace = await this.marketplaceRepository.findOne({ where: { marketplace_name_id: marketplaceNameId } })
        const subscribeMarketplace:SubscribedMarketplaces = {
            marketplace_name_id:marketplace.marketplace_name_id,
            marketplace_name:marketplace.marketplace_name,
            tenant_id:tenantId
        }
        await this.subscribedMarketplacesRepository.save(subscribeMarketplace) 
    }

    async deleteWithSubTree(tenantCategoryId:string, tenantId:string){
        await this.tenantCategoryRepository.delete({ tenant_category_id: tenantCategoryId, tenant_id:tenantId })
    }

    //Doubtful
    async deleteWithoutSubTrees(tenantCategoryId:string, tenantId:string){
        await this.tenantDataSource.manager.transaction(async(entityManager)=>{
            const category = await this.getTenantCategoryById(tenantCategoryId,tenantId)
            await entityManager.getRepository(TenantCategory).update({ parent_id: tenantCategoryId, tenant_id:tenantId }, { parent: category.parent, depth:category.depth+1 })
            await entityManager.getRepository(TenantCategory).delete({ tenant_category_id: tenantCategoryId })
        })
    }

    async editCategoryName(tenantCategoryId:string, tenantId:string, newName:string){
        const category = await this.getTenantCategoryById(tenantCategoryId, tenantId)
        await this.duplicateCheck(category,newName,ADDSIBLING)
        category.category_name = newName;
        await this.tenantCategoryRepository.save(category)
    }

    async coreIsRoot(coreCategory:CoreCategory){
        if(coreCategory.parent===null) return true
        else return false
    }

    async generateIsLeafData(category:TenantCategory|CoreCategory|MarketplaceCategory, databaseName:string){
        if(category.children.length===0) category.is_leaf=true
        else category.is_leaf=false

        if(databaseName===TENANT) await this.tenantCategoryRepository.save(category)
        if(databaseName===CORE) await this.coreCategoryRepository.save(category)
        if(databaseName===MARKETPLACE)  await this.marketplaceCategoryRepository.save(category)   
    }
    
    async traverseAndInsert(rootCategory:CoreCategory, tenantId:string){
        let nodes:CoreCategory[] = []
        nodes.push(rootCategory)
        let ids:{id:string, depth:number}[] = [{id:null, depth:-1}]

        while(nodes.length!=0){
            let curr = nodes.pop()
            if(curr!=null){
                while(curr.depth<ids[ids.length-1].depth+1) ids.pop()
                const savedTenantCategory = await this.saveCategory(this.tenantDataSource.createEntityManager(), tenantId,curr.category_name ,ids[ids.length-1].id, curr.depth, curr.is_leaf )
                if(ids[ids.length-1].depth+1===savedTenantCategory.depth && curr.is_leaf===false) {ids.push({id:savedTenantCategory.tenant_category_id,depth:savedTenantCategory.depth}); console.log('pushed\n')}
            }
            for(let i = curr.children.length-1;i>=0;i--){
                const child = await this.coreCategoryRepository.findOne({where:{core_category_id:curr.children[i].core_category_id},relations:{children:true,parent:true}})
                nodes.push(child)
            }
        }
    }

    async inheritFromCore(coreCategoryRootId:string, tenantId:string){
        const coreCategory = await this.getCoreCategoryById(coreCategoryRootId)
        if(!await this.coreIsRoot(coreCategory)) throw new RpcException({message:`Enter Root Category Id`,status:6})
        await this.traverseAndInsert(coreCategory, tenantId)
    }




}
