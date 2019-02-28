export function hex(value: number) 
{
   return (value<=0xF ? "0":"") + value.toString(16);
}

export function bitmapToByte(bmp: string) 
{
   let byteval = 0;
   if(bmp.Length()==8)
   {
     // mono
     for(let t=1,pos=128;t<=8;t++,pos=pos>>1)
     {
        let c = bmp.CharAt(t);
        if(c!='.' && c!='-' && c!='0')
        {
           byteval = byteval | pos;
        }
     }
   }
   else
   {
     // multicolor 
     for(let t=1,pos=6;t<=4;t++,pos-=2)
     {
        let c = bmp.CharAt(t);
        let code = 0b00;
        
        if(c=='1' || c=='B') code = 0b01;
        if(c=='2' || c=='F') code = 0b10;
        if(c=='3' || c=='A') code = 0b11;

        byteval = byteval | (code<<pos);
     }
   }
   return String(byteval);
}

export function GetParm(Linea: string, token: string, num: number): string
{
    let split = SplitToken(Linea, token);
    if(split.length < num) return "";
    else return split[num];
}

function SplitToken(Linea: string, token: string)
{
    return Linea.split(token);
}

export function GetToken(Linea: string, Separator: string)
{   
   let Token: string;
   let Rest: string;

   let x = Linea.AnsiPos(Separator);

   if(x==0)
   {
      Token = "";
      Rest = Linea;
   }
   else
   {
      Token = Linea.SubString(1,x-1);
      Rest = Linea.SubString(x+Separator.Length(), Linea.Length());
   }
   return { Token, Rest };
}

export function UpperCase(s: string)
{
    return s.toUpperCase();
}

export function Trim(s: string): string
{
   return s.trim();
}
