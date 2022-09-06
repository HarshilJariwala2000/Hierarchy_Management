import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CategoryModifyService } from './category.modify.service';
import { CategoryMapService } from './category.map.service';
const t1 = 1;
@Controller('category')
export class CategoryController {
    constructor(private readonly categoryService: CategoryModifyService,
                private readonly categoryMapService:CategoryMapService) {}
    
    @Get('getTenantCategoryById')
    async getTenantCategoryByIdR(@Query('id') id:number){
        const tenantId = 1;
        return await this.categoryService.getTenantCategoryById(id,tenantId)
    }

    @Get('check')
    async check(){
        // return this.categoryService.check()
        return this.categoryMapService.displayUnmappedCategories(1)
    }

    @Get('t')
    async tenantToCoreMapping(){
        
    }

    @Get('getPath')
    async getPath(){
       return this.categoryMapService.getCorePath(5)
    }

    @Post('addLevel')
    async addLevel(@Query('id') id:number, @Body() body){
        return this.categoryService.addLevel(id,1,body.categoryName)
    }

    @Post('addSibling')
    async addSibling(@Query('id') id:number, @Body() body){
        return this.categoryService.addSibling(id,1,body.categoryName)
    }

    @Post('updateHierarchyLevel')
    async updateHierarchyLevel(){
        return this.categoryService.updateHierarchyLevel(1,1)
    }

    @Post('inheritFromCore')
    async inheritFromCore(){
        
    }

    @GrpcMethod('CategoryService','getTenantCategoryById')
    async getTenantCategoryById(body){
        const tenantId = "41c6438b-6e6f-4ee0-bdd2-e8fb3053b332"
    }

    @Get('displayMappedCategories')
    async displayMappedCategories(){
        return this.categoryMapService.displayMappedCategories(t1)
    }

    @Get('displayMappedChannels')
    async displayMappedChannels(){
        return this.categoryMapService.displayMappedChannels(t1)
    }

    @Get('displayUnmappedCategories')
    async displayUnmappedCategories(){
        return this.categoryMapService.displayUnmappedCategories(t1)
    }

    @Get('displayUnmappedChannels')
    async displayUnmappedChannels(){
        return this.categoryMapService.displayUnmappedChannels(t1)
    }
    
}
