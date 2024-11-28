import { Document,Model } from "mongoose";

interface MonthData {
    month:string,
    count:number,
};
//<T extends Document> is a generic type parameter that, means that it can work with any mongoose model that extends Document


export async function generateLast12MonthsData<T extends Document>(
    model:Model<T>
):Promise<{ last12Months: MonthData[]}>{
    const last12Months:MonthData[] = [];
    const currntDate = new Date();
    currntDate.setDate(currntDate.getDate() + 1 );

    for(let i = 11; i>=0; i--){
        //currntDate.getDate() - i * 28: Subtract i multiplied by 28 from the current day of the month. This effectively moves the date back by approximately one month.
        const endDate = new Date(currntDate.getFullYear(), currntDate.getMonth(), currntDate.getDate() - i * 28);
        const startDate =  new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28);

        //endDate.getDate() - 28: Subtract 28 from the day of the endDate. This effectively moves the date back by approximately one month.
        const monthYear = endDate.toLocaleString('default',{day:"numeric",month:"short",year:"numeric"});

        //countDocuments methord count how many document document ctreated 
        const count = await model.countDocuments({
            createdAt:{
                $gte:startDate,
                $lt:endDate
            }
        });
        last12Months.push({month:monthYear, count});
    };
    return {last12Months};
}