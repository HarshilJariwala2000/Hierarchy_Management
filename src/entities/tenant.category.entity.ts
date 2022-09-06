import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    TreeChildren,
    TreeParent,
    TreeLevelColumn,PrimaryColumn, ManyToOne, JoinTable, JoinColumn, Unique, OneToMany, 
  } from "typeorm"
  
  @Entity()
  export class SubscribedMarketplaces{
    @PrimaryGeneratedColumn()
    marketplace_name_id:number

    @PrimaryColumn()
    marketplace_name:string

    @PrimaryColumn()
    tenant_id:number
}

@Entity()
@Tree("adjacency-list")
export class TenantCategory {
    @PrimaryGeneratedColumn()
    tenant_category_id: number
    
    @Column()
    tenant_id:number

    // @OneToMany(()=>TenantToMarketplaceMapping,(x)=>x.tenantCategory)
    // x:TenantToMarketplaceMapping[]

    @Column({nullable:true})
    category_name: string
  
    @OneToMany((type) => TenantCategory, (category) => category.parent,{nullable:true})
    children: TenantCategory[]
  
    @Column({nullable:true})
    parent_id:number;
  
    @ManyToOne((type) => TenantCategory, (category) => category.children,{onUpdate:"CASCADE",onDelete:"CASCADE"})
    @JoinColumn({name:'parent_id'})
    parent: TenantCategory
  
    @TreeLevelColumn()
    @Column({nullable:true})
    depth:number

    @Column({nullable:true})
    is_leaf:boolean
  }

  @Entity()
  export class TenantToCoreMapping{
    
    @ManyToOne(()=>TenantCategory,(category)=>category.tenant_category_id)
    @JoinColumn([
      {name:"tenant_category_leaf_id", referencedColumnName:"tenant_category_id"},
    ])
    tenant:TenantCategory

    @PrimaryColumn()
    tenant_category_leaf_id:number
    
    @PrimaryColumn()
    tenant_id:number
    // @PrimaryColumn()
    // categoryLeafId:string

    @PrimaryColumn()
    core_leaf_id:number
  }

  @Entity()
  export class CoreToMarketplaceMapping{
    @PrimaryColumn()
    core_leaf_id:number

    @PrimaryColumn()
    marketplace_leaf_id:number

    @Column()
    marketplace_name_id:number

    @Column()
    marketplace_name:string

    @ManyToOne(()=>SubscribedMarketplaces,(marketplace)=>marketplace.marketplace_name_id)
    @JoinColumn([
      { name: "marketplace_name_id", referencedColumnName: "marketplace_name_id" },
      { name: "marketplace_name", referencedColumnName: "marketplace_name" },
      {name:'tenant_id',referencedColumnName:'tenant_id'}
    ])
    marketplace:SubscribedMarketplaces

    @PrimaryColumn()
    tenant_id:number
  }

  @Entity()
  export class TenantToMarketplaceMapping{

    @ManyToOne(()=>TenantCategory,(category)=>category.tenant_category_id)
    @JoinColumn([
      {name:"tenant_category_leaf_id", referencedColumnName:"tenant_category_id"},
    ])
    tenant:TenantCategory

    @PrimaryColumn()
    tenant_category_leaf_id:number

    @PrimaryColumn()
    tenant_id:number

    @Column()
    marketplace_name:string

    @Column()
    marketplace_name_id:number

    @ManyToOne(()=>SubscribedMarketplaces,(marketplace)=>marketplace.marketplace_name_id)
    @JoinColumn([
      { name: "marketplace_name_id", referencedColumnName: "marketplace_name_id" },
      { name: "marketplace_name", referencedColumnName: "marketplace_name" },
      { name: 'tenant_id' , referencedColumnName:'tenant_id'}
    ])
    marketplace:SubscribedMarketplaces

    @PrimaryColumn()
    marketplace_leaf_id:number
  }

  @Entity()
  export class TenantHierarchyLevel{
    @PrimaryColumn()
    tenant_id:number

    @Column({nullable:true})
    level:number
  }
