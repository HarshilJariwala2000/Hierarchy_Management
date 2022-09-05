import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CategoryModifyService } from './category.modify.service';
import { CategoryMapService } from './category.map.service';

@Controller('category')
export class CategoryController {
    constructor(private readonly categoryService: CategoryModifyService,
                private readonly categoryMapService:CategoryMapService) {}
    
    @Get('getTenantCategoryById')
    async getTenantCategoryByIdR(@Query('id') id:string){
        const tenantId = "41c6438b-6e6f-4ee0-bdd2-e8fb3053b332"
        return await this.categoryService.getTenantCategoryById(id,tenantId)
    }

    @Get('check')
    async check(){
        return this.categoryService.check()
    }

    @Get('getPath')
    async getPath(){
        const c = await this.categoryService.getTenantCategoryById("dd57cb2d-b47c-4958-84e4-20ebbb11f60f","41c6438b-6e6f-4ee0-bdd2-e8fb3053b332")
        return this.categoryMapService.getTenantPath(c)
    }

    @Post('addLevel')
    async addLevel(@Query('id') id:string, @Body() body){
        return this.categoryService.addLevel(id,"41c6438b-6e6f-4ee0-bdd2-e8fb3053b332",body.categoryName)
    }

    @Post('addSibling')
    async addSibling(@Query('id') id:string, @Body() body){
        return this.categoryService.addSibling(id,"41c6438b-6e6f-4ee0-bdd2-e8fb3053b332",body.categoryName)
    }

    @Post('updateHierarchyLevel')
    async updateHierarchyLevel(){
        return this.categoryService.updateHierarchyLevel(1,'jg')
    }

    @Post('inheritFromCore')
    async inheritFromCore(){
        await this.categoryService.inheritFromCore("61310f8f-773f-4811-9f4f-b38e03f08503","41c6438b-6e6f-4ee0-bdd2-e8fb3053b332")
    }

    @GrpcMethod('CategoryService','getTenantCategoryById')
    async getTenantCategoryById(body){
        const tenantId = "41c6438b-6e6f-4ee0-bdd2-e8fb3053b332"
        return this.categoryService.getTenantCategoryById(body.id,tenantId)
    }
    
}
