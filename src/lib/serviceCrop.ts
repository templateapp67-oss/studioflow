/** Source rectangle for a 3:2 card. All crop bounds stay inside the source. */
export function serviceCropRect(width:number,height:number,zoom=1,x=50,y=50){
 const scale=Math.max(1,Math.min(3,zoom));
 const w=Math.min(width,height*1.5)/scale,h=w/1.5;
 return {x:(width-w)*Math.max(0,Math.min(100,x))/100,y:(height-h)*Math.max(0,Math.min(100,y))/100,width:w,height:h};
}
