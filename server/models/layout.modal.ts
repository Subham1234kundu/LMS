import { Schema,model,Document } from "mongoose";

interface FaqItems extends Document{
    question: string;
    answer:string;
};

interface Catagory extends Document{
    title:string;
};

interface BannerImage extends Document{
    public_id:string;
    url:string;
};

interface Layout extends Document{
    type:string;
    faq:FaqItems[];
};

interface Layout extends Document{
    type:string;
    faq:FaqItems[];
    categories:Catagory[];
    banner:{
        image:BannerImage,
        title:string,
        subTitle:string,
    };
};

const faqSchema = new Schema<FaqItems>({
    question:{type:String},
    answer:{type:String},

});

const catagorySchema = new Schema<Catagory>({
    title:{type:String}
});

const bannerImageSchema = new Schema<BannerImage>({
    public_id:{type:String},
    url:{type:String},
});

const layoutSchema = new Schema<Layout>({
    type:{type:String},
    faq:[faqSchema],
    categories:[catagorySchema],
    banner:{
        image:bannerImageSchema,
        title:{type:String},
        subTitle:{type:String},
    },
});

const LayoutModel = model<Layout>('Layout',layoutSchema);

export default LayoutModel;