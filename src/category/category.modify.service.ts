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
const CORE:string = "core"
const MARKETPLACE:string = "marketplace"
const TENANT:string = "tenant"

interface bulkUploadParentChild{
    categoryName:string,
    parentCategoryName:string
}

interface bulkUploadPath{
    "Full Hierarchy":string
}

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

    async getTenantCategoryById(tenantCategoryid:number, tenantId:number):Promise<TenantCategory>{
        try{
        const tenantCategory = await this.tenantCategoryRepository.findOne({where:{tenant_category_id:tenantCategoryid, tenant_id:tenantId}, relations:{children:true,parent:true}})
        if(!tenantCategory) throw new RpcException({message:"Category does not exist",status:5})
        else return tenantCategory
        }catch(error){
            throw new RpcException({message:error.message,status:error.status})
        }
    }

    async getTenantCategoryChildren(tenantCategoryid:number, tenantId:number){
        return (await this.getTenantCategoryById(tenantCategoryid,tenantId)).children
    }

    async getCoreCategoryById(coreCategoryid:number):Promise<CoreCategory>{
        try{
            const coreCategory = await this.coreCategoryRepository.findOne({where:{core_category_id:coreCategoryid}, relations:{children:true,parent:true}})
            if(!coreCategory) throw new RpcException({message:"Category does not exist",status:5})
            else return coreCategory
            }catch(error){
                throw new RpcException({message:error.message,status:error.status})
            }
    }

    async getCoreCategoryChildren(coreCategoryid:number){
        return (await this.getCoreCategoryById(coreCategoryid)).children
    }

    async getMarketplaceCategoryById(marketplaceCategoryid:number):Promise<MarketplaceCategory>{
        try{
            const marketplaceCategory = await this.marketplaceCategoryRepository.findOne({where:{marketplace_category_id:marketplaceCategoryid}, relations:{children:true,parent:true}})
            if(!marketplaceCategory) throw new RpcException({message:"Category does not exist",status:5})
            else return marketplaceCategory
            }catch(error){
                throw new RpcException({message:error.message,status:error.status})
            }
    }

    async getMarketplaceCategoryChildren(marketplaceCategoryid:number){
        return (await this.getMarketplaceCategoryById(marketplaceCategoryid)).children
    }

    async canAddLevel(depth:number, tenantId:number):Promise<boolean>{
        const levelLimit = await this.tenantHierarchyLevelRepository.findOne({ where: { tenant_id:tenantId } })
        if (depth + 1 >= levelLimit.level) return false
        else return true
    }

    async saveCategory(entityManager:EntityManager, tenantId:number, categoryName:string, parent:TenantCategory | number, depth?:number, isLeaf?:boolean):Promise<TenantCategory>{
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

    async addLevel(tenantCategoryid:number, tenantId:number, categoryName:string){
        const category:TenantCategory = await this.getTenantCategoryById(tenantCategoryid, tenantId)
        if(!await this.canAddLevel(category.depth, tenantId)) throw new RpcException({message:`Hierarchy Limit Reached`, status:7})
        await this.duplicateCheck(category,categoryName,ADDLEVEL)

        await this.tenantDataSource.manager.transaction(async(entityManager)=>{
            // Write code to transfer attributes, workflow and mappings to new Leaf Node created
            await this.changeIsLeafToFalse(entityManager, category)
            await this.saveCategory(entityManager, tenantId, categoryName, category.tenant_category_id, category.depth+1, true)
        })
    }

    async addSibling(tenantCategoryid:number, tenantId:number, categoryName:string){
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

    async maxCategoryDepth(tenantId:number){
        const depth = await this.tenantDataSource.getRepository(TenantCategory).createQueryBuilder('tenantCategory').where("tenantCategory.tenant_id=:id",{id:tenantId}).select("MAX(tenantCategory.depth)","max").getRawOne()
        return depth.max
    }

    async updateHierarchyLevel(level:number, tenantId:number){
        const maxTenantLevel = await this.maxCategoryDepth(tenantId)
        if(maxTenantLevel>level) throw new RpcException({message:`Tenant already have maximum level of ${maxTenantLevel.max+1}`,status:9})
        const tenantHierarchyLevel:TenantHierarchyLevel = {tenant_id:tenantId,level:level}
        await this.tenantHierarchyLevelRepository.save(tenantHierarchyLevel) 
    }

    async subscribeToMarketplaces(marketplaceNameId:number, tenantId:number){
        const marketplace = await this.marketplaceRepository.findOne({ where: { marketplace_name_id: marketplaceNameId } })
        const subscribeMarketplace:SubscribedMarketplaces = {
            marketplace_name_id:marketplace.marketplace_name_id,
            marketplace_name:marketplace.marketplace_name,
            tenant_id:tenantId
        }
        await this.subscribedMarketplacesRepository.save(subscribeMarketplace) 
    }

    async deleteWithSubTree(tenantCategoryId:number, tenantId:number){
        await this.tenantCategoryRepository.delete({ tenant_category_id: tenantCategoryId, tenant_id:tenantId })
    }

    async deleteWithoutSubTrees(tenantCategoryId:number, tenantId:number){
        await this.tenantDataSource.manager.transaction(async(entityManager)=>{
            const category = await this.getTenantCategoryById(tenantCategoryId,tenantId)
            await entityManager.getRepository(TenantCategory).update({ parent_id: tenantCategoryId, tenant_id:tenantId }, { parent: category.parent, depth:category.depth })
            await entityManager.getRepository(TenantCategory).delete({ tenant_category_id: tenantCategoryId })
        })
    }

    async editCategoryName(tenantCategoryId:number, tenantId:number, newName:string){
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
    
    async traverseAndInsert(rootCategory:CoreCategory, tenantId:number){
        let nodes:CoreCategory[] = []
        nodes.push(rootCategory)
        let ids:{id:number, depth:number}[] = [{id:null, depth:-1}]

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

    async inheritFromCore(coreCategoryRootId:number, tenantId:number){
        const coreCategory = await this.getCoreCategoryById(coreCategoryRootId)
        if(!await this.coreIsRoot(coreCategory)) throw new RpcException({message:`Enter Root Category Id`,status:6})
        await this.traverseAndInsert(coreCategory, tenantId)
    }

    async excelFileReader(){
        const filePath = path.resolve(__dirname, '../../../categoryTemplate/test.xlsx')
        const file = excelReader.readFile(filePath)
        let data = []
        const sheets = file.SheetNames
        for(let i = 0; i < sheets.length; i++){
        const temp = excelReader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]])
        temp.forEach((res) => {data.push(res)})
        }
        return data
    }

    async removeSubArrays(array:any){
        // console.log(array[0])
        let removedSubArrays = {}
        let k=0
        for(let i=0;i<Object.keys(array).length-1;i++){
            // console.log(array[i+1])
            const isSubArray = array[i].every(val=>array[i+1].includes(val))
            if(!isSubArray) {
                removedSubArrays[k] = array[i]
                k++
            }
        }
        removedSubArrays[k] = array[Object.keys(array).length-1]
        return removedSubArrays

    }

    //Have to Add Duplicacy Check
    async bulkUploadCategoryPathTemaplate(data:bulkUploadPath[], tenantId:number){
        let category2DArray = {}
        let pathArray = data.map(x=>x['Full Hierarchy'])
        for(let i = 0; i<pathArray.length; i++){
            pathArray[i] = pathArray[i].replace(/\s*>\s*/g,'>').trim()
            let depth = (pathArray[i].match(/>/g) || []).length-1
            if(!await this.canAddLevel(depth, tenantId)) throw new RpcException({message:`Max Hierarchy Level Exceeded at Excel Row ${i+1}`, status:6})
        }
        pathArray.sort()
        for(let i = 0; i<pathArray.length; i++){
           category2DArray[i] = pathArray[i].split('>')
        }
        /////////////////////////////
        const category2DArrayWithSubArraysRemoved = await this.removeSubArrays(category2DArray)
        console.log(category2DArrayWithSubArraysRemoved)
        ////////////////////////////
        let sameParentLevel:number = 0
        let ids:number[] = [null];
        let flag = 0;
        for(let i=0; i<Object.keys(category2DArrayWithSubArraysRemoved).length; i++){
            if(sameParentLevel===0) ids = [null]
            if(i!=0) {
                while(JSON.stringify(category2DArrayWithSubArraysRemoved[i].slice(0,sameParentLevel))!=JSON.stringify(category2DArrayWithSubArraysRemoved[i-1].slice(0,sameParentLevel))){
                    sameParentLevel--
                    ids.pop()
                }
                while(JSON.stringify(category2DArrayWithSubArraysRemoved[i].slice(0,sameParentLevel+1))===JSON.stringify(category2DArrayWithSubArraysRemoved[i-1].slice(0,sameParentLevel+1))){
                    sameParentLevel++
                }
            }
            for(let j=sameParentLevel; j<category2DArrayWithSubArraysRemoved[i].length; j++){
                const x = new TenantCategory()
                x.category_name = category2DArrayWithSubArraysRemoved[i][j]
                x.parent_id = ids[j]
                x.depth = j
                x.tenant_id = tenantId
                if(j===category2DArrayWithSubArraysRemoved[i].length-1) x.is_leaf=true
                else x.is_leaf = false
                const saved = await this.tenantCategoryRepository.save(x)
                if(j!=category2DArrayWithSubArraysRemoved[i].length-1) ids.push(saved.tenant_category_id) 
            }
            if(sameParentLevel===0) sameParentLevel = category2DArrayWithSubArraysRemoved[i].length-1
        }       
    }

}
