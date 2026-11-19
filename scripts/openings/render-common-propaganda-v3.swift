import Foundation
import AVFoundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO

// All animation is deterministic. Art is raster pixel art; text and sprites stay crisp.
// BEGIN SHARED STORYBOARD READER — keep identical across the three current renderers.
let storyboardURL=URL(fileURLWithPath:ProcessInfo.processInfo.environment["OPENING_STORYBOARD"] ?? "docs/영상-3편-콘티와-대사.md")
let storyboardLines=try String(contentsOf:storyboardURL,encoding:.utf8).components(separatedBy:.newlines)
let storyboardPattern=try NSRegularExpression(pattern: #"^- \*\*([CGL][0-9]{3})\*\*: (.+)$"#)
var storyboardText:[String:String]=[:]
for line in storyboardLines {
    let range=NSRange(line.startIndex...,in:line)
    if let match=storyboardPattern.firstMatch(in:line,range:range),
       let idRange=Range(match.range(at:1),in:line),let textRange=Range(match.range(at:2),in:line) {
        let id=String(line[idRange]),value=String(line[textRange])
        precondition(storyboardText[id]==nil,"Duplicate storyboard ID: \(id)")
        precondition(!value.trimmingCharacters(in:.whitespaces).isEmpty,"Empty storyboard text: \(id)")
        storyboardText[id]=value
    }
}
func scriptText(_ id:String)->String {
    guard let value=storyboardText[id] else {fatalError("Missing storyboard text: \(id). Edit docs/영상-3편-콘티와-대사.md")}
    return value
}
// END SHARED STORYBOARD READER
let requiredScriptIDs=["C001", "C002", "C003", "C004", "C005", "C006", "C007", "C008", "C009", "C010", "C011", "C012", "C013", "C014", "C015", "C016", "C017", "C018", "C019", "C020", "C021", "C022", "C023", "C024", "C025", "C026", "C027", "C028", "C029", "C030", "C031", "C032", "C033", "C034", "C035", "C036", "C037", "C038", "C039", "C040", "C041", "C042", "C043", "C044", "C045", "C046", "C047", "C048", "C049", "C050", "C051", "C052", "C053", "C054", "C055", "C056", "C057", "C058", "C059", "C060", "C061", "C062", "C063", "C064", "C065", "C066", "C067", "C068", "C069", "C070", "C071", "C072", "C073", "C074", "C075", "C076", "C077", "C078", "C079", "C080", "C081", "C082", "C083", "C084", "C085", "C086"]
for id in requiredScriptIDs {_ = scriptText(id)}
if CommandLine.arguments.contains("--dump-script") {
    let data=try JSONSerialization.data(withJSONObject:Dictionary(uniqueKeysWithValues:requiredScriptIDs.map{($0,scriptText($0))}),options:[.sortedKeys])
    print(String(data:data,encoding:.utf8)!);exit(0)
}
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=URL(fileURLWithPath:ProcessInfo.processInfo.environment["OPENING_OUTPUT_DIR"] ?? root.appendingPathComponent("output/openings/common-propaganda-v3").path)
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
let W=1280,H=720,fps:Int32=24,duration=128.0
for name in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    CTFontManagerRegisterFontsForURL(FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/\(name)") as CFURL,.process,nil)
}
func load(_ name:String)->CGImage {
    let u=root.appendingPathComponent("assets/openings/common-propaganda-v3/\(name).png")
    guard let s=CGImageSourceCreateWithURL(u as CFURL,nil),let im=CGImageSourceCreateImageAtIndex(s,0,nil) else {fatalError("Missing art: \(u.path)")};return im
}
let city=load("bright-city"),room=load("human-room")
func color(_ hex:Int,_ a:Double=1)->NSColor {NSColor(calibratedRed:Double((hex>>16)&255)/255,green:Double((hex>>8)&255)/255,blue:Double(hex&255)/255,alpha:a)}
let ink=color(0x173D4A),cream=color(0xFFF8DC),mint=color(0xA8E9CF),coral=color(0xF26C68),yellow=color(0xFFD66E),blue=color(0x9ECFEF),night=color(0x111D2B),paper=color(0xF4DFB1)
func clamp(_ x:Double)->Double {min(1,max(0,x))}
func ease(_ x:Double)->Double {let p=clamp(x);return 1-pow(1-p,3)}
func rect(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {c.setFillColor(col.cgColor);c.fill(CGRect(x:round(x),y:round(y),width:round(w),height:round(h)))}
// Wrap edited prose at measured glyph boundaries without changing the source copy.
func copyLines(_ value:String,_ size:Double,_ width:Double)->[String] {
    let font=CTFontCreateWithName((size>=32 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let attr=NSAttributedString(string:value,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font])
    let setter=CTTypesetterCreateWithAttributedString(attr)
    let text=value as NSString
    var offset=0,result:[String]=[]
    while offset<text.length {
        let count=CTTypesetterSuggestLineBreak(setter,offset,width)
        precondition(count>0,"Cannot fit dialogue")
        result.append(text.substring(with:NSRange(location:offset,length:count)).trimmingCharacters(in:.whitespaces))
        offset+=count
    }
    return result
}
func copyWidth(_ value:String,_ size:Double)->Double {
    let font=CTFontCreateWithName((size>=32 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let line=CTLineCreateWithAttributedString(NSAttributedString(string:value,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font]))
    return CTLineGetTypographicBounds(line,nil,nil,nil)
}
func label(_ c:CGContext,_ s:String,_ x:Double,_ y:Double,_ size:Double=36,_ col:NSColor=ink,_ centered:Bool=false,_ maxWidth:Double=1200) {
    let font=CTFontCreateWithName((size>=32 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let line=CTLineCreateWithAttributedString(NSAttributedString(string:s,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font,.foregroundColor:col]))
    let w=CTLineGetTypographicBounds(line,nil,nil,nil)
    precondition(w<maxWidth,"Text overflow \(s): \(w)")
    c.setShouldAntialias(false);c.setShouldSmoothFonts(false);c.textMatrix = .identity
    c.textPosition=CGPoint(x:round(centered ? x-w/2:x),y:round(y));CTLineDraw(line,c)
}
func card(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor=cream) {
    rect(c,x+8,y-8,w,h,ink);rect(c,x,y,w,h,ink);rect(c,x+4,y+4,w-8,h-8,col)
}
func picture(_ c:CGContext,_ im:CGImage,_ box:CGRect) {c.interpolationQuality = .none;c.draw(im,in:box)}
func star(_ c:CGContext,_ x:Double,_ y:Double,_ s:Double,_ col:NSColor) {
    rect(c,x+s*2,y,s,s*5,col);rect(c,x,y+s*2,s*5,s,col);rect(c,x+s,y+s,s*3,s*3,col)
}
let patterns:[String:[String]] = [
"paper":["1111111100","1222222110","1233332221","1222222221","1233333321","1222222221","1233333321","1222222221","1233332221","1222222221","1111111111"],
"chip":["001010100","011111110","112222211","012333210","112323211","012333210","112222211","011111110","001010100"],
"book":["011111110","112222211","122333221","122222221","122333221","122222221","122333221","122222221","111111111","012222221","011111111"],
"coin":["00111100","01222210","12233221","12323231","12323231","12233221","01222210","00111100"],
"case":["0001111000","0001221000","1111111111","1222222221","1222332221","1112331111","1222332221","1222222221","1111111111"],
"cursor":["10000000","11000000","12100000","12210000","12221000","12222100","12211110","12121000","11012100","10012100","00001100"]
]
func sprite(_ c:CGContext,_ name:String,_ x:Double,_ y:Double,_ s:Double,_ tint:NSColor=mint) {
    guard let rows=patterns[name] else{return}
    for (j,row) in rows.enumerated(){for (i,ch) in row.enumerated(){if ch != "0" {rect(c,x+Double(i)*s,y+Double(rows.count-j-1)*s,s,s,ch=="1" ? ink:ch=="2" ? tint:cream)}}}
}
func pop(_ c:CGContext,_ x:Double,_ y:Double,age:Double,_ body:()->Void) {
    let p=ease(age/0.45);if p<=0{return};c.saveGState();c.setAlpha(p);c.translateBy(x:x,y:y-28*(1-p));body();c.restoreGState()
}
func chip(_ c:CGContext,_ x:Double,_ y:Double,_ title:String,_ tint:NSColor=mint,_ size:Double=10) {
    sprite(c,"chip",x-4.5*size,y-4.5*size,size,tint);label(c,title,x,y-4.5*size-34,28,ink,true)
}
func progress(_ c:CGContext,_ t:Double) {
    rect(c,48,666,1184,4,ink.withAlphaComponent(0.15));rect(c,48,666,1184*clamp(t/64),4,coral)
    label(c,scriptText("C001"),50,687,18,ink);label(c,scriptText("C002"),1090,687,18,ink,true)
}
func ticker(_ c:CGContext,_ s:String,_ t:Double) {
    let cycle=max(1280,copyWidth(s,22)+180)
    rect(c,0,0,1280,43,ink)
    let x=1280-(t*65).truncatingRemainder(dividingBy:cycle)
    label(c,s,x,12,22,cream,false,Double.greatestFiniteMagnitude)
    label(c,s,x-cycle,12,22,cream,false,Double.greatestFiniteMagnitude)
}
func heading(_ c:CGContext,_ year:String,_ title:String) {
    card(c,48,574,172,62,yellow);label(c,year,134,590,38,ink,true);label(c,title,253,590,40,ink)
}
func subtitle(_ c:CGContext,_ sourceLines:[String],_ col:NSColor=ink,_ dark:Bool=false) {
    let lines=sourceLines.flatMap{copyLines($0,34,1124)}
    precondition(lines.count<=3,"Subtitle needs a longer scene or a different layout")
    let y=dark ? 55.0:65.0
    if dark {rect(c,48,y-15,1184,Double(lines.count)*46+26,night.withAlphaComponent(0.96))}
    else {card(c,48,y-15,1184,Double(lines.count)*46+26,cream)}
    for (i,s) in lines.enumerated(){label(c,s,78,y+Double(lines.count-1-i)*46,34,col)}
}
func confetti(_ c:CGContext,_ t:Double) {
    for i in 0..<65 {
        let x=Double((i*197)%1280)+sin(t+Double(i))*24
        let y=720-(t*70+Double(i*79)).truncatingRemainder(dividingBy:780)
        rect(c,x,y,i%2==0 ? 8:4,i%2==0 ? 4:12,[coral,yellow,mint,blue][i%4])
    }
}
func ad(_ c:CGContext,_ t:Double) {
    picture(c,city,CGRect(x:0,y:0,width:1280,height:720));rect(c,0,0,1280,720,cream.withAlphaComponent(0.28));progress(c,t)
    if t<5 {
        let p=ease(t/0.7);c.saveGState();c.setAlpha(p)
        card(c,220,215,840,335,cream)
        star(c,320,450,8,coral);star(c,890,282,5,mint)
        label(c,scriptText("C003"),640,401,96,ink,true)
        label(c,scriptText("C004"),640,316,42,ink,true)
        label(c,scriptText("C005"),640,255,28,ink,true);c.restoreGState();confetti(c,t)
    } else if t<18 {
        let u=t-5;heading(c,scriptText("C006"),scriptText("C007"))
        for (i,name) in [scriptText("C008"),scriptText("C009"),scriptText("C010")].enumerated() {
            pop(c,70+Double(i)*400,250,age:u-Double(i)*0.65) {
                card(c,0,0,350,245,[mint,blue,yellow][i]);rect(c,12,193,326,40,ink)
                label(c,name,175,204,28,cream,true)
                let question=[scriptText("C011"),scriptText("C012"),scriptText("C013")][i]
                label(c,question,175,141,26,ink,true)
                let n=min(3,max(0,Int((u-1-Double(i)*0.65)*2)))
                for k in 0..<n {rect(c,30,103-Double(k)*23,Double(260-k*35),9,ink.withAlphaComponent(0.5))}
                star(c,275,36,4,coral)
            }
        }
        subtitle(c,u<6 ? [scriptText("C014")]:[scriptText("C015")])
        ticker(c,scriptText("C016"),u)
    } else if t<30 {
        let u=t-18;heading(c,scriptText("C017"),scriptText("C018"))
        card(c,65,245,440,285,cream);label(c,scriptText("C019"),285,481,30,ink,true)
        for i in 0..<4 {label(c,"\(i+1).",95,431-Double(i)*45,26,ink);rect(c,145,435-Double(i)*45,220,7,ink.withAlphaComponent(0.25))
            if u>Double(i)*0.65+0.5 {label(c,scriptText("C020"),435,425-Double(i)*45,26,color(0x298E78),true)}}
        let x=560+sin(u*2)*8;sprite(c,"paper",x,340,12,yellow)
        for i in 0..<4 {rect(c,700+Double(i)*25,380,12,12,mint)}
        chip(c,1000,407,scriptText("C021"),mint,15)
        if u>3 {card(c,805,250,350,60,coral);label(c,scriptText("C022"),980,266,28,cream,true)}
        subtitle(c,u<6 ? [scriptText("C023")]:[scriptText("C024")])
        ticker(c,scriptText("C025"),u)
    } else if t<41 {
        let u=t-30;heading(c,scriptText("C026"),scriptText("C027"))
        for i in 0..<3 {
            let x=Double(210+i*430);pop(c,x-105,270,age:u-Double(i)*0.4){card(c,0,0,210,210,[blue,mint,yellow][i]);sprite(c,["paper","chip","case"][i],62,80,9,[blue,mint,yellow][i]);label(c,[scriptText("C028"),scriptText("C029"),scriptText("C030")][i],105,34,28,ink,true)}
        }
        if u>3 {rect(c,155,220,970,36,ink);label(c,scriptText("C031"),640,227,26,cream,true)}
        subtitle(c,u<5.5 ? [scriptText("C032")]:[scriptText("C033")])
        ticker(c,scriptText("C034"),u)
    } else if t<52 {
        let u=t-41;heading(c,scriptText("C035"),scriptText("C036"))
        let p=ease((u-1)/5)
        for i in 0..<6 {
            let a=Double(i)*Double.pi/3;let x=640+cos(a)*360*(1-p),y=378+sin(a)*130*(1-p)
            if p<0.98 {rect(c,min(x,640),y,abs(640-x)+4,4,ink);rect(c,638,min(y,378),4,abs(378-y)+4,ink);chip(c,x,y,scriptText("C037"),[mint,blue,yellow][i%3],7)}
            for k in 0..<5 {let q=(u*0.5+Double(k)/5).truncatingRemainder(dividingBy:1);rect(c,x+(640-x)*q,y+(378-y)*q,8,8,coral)}
        }
        if p>0.6 {pop(c,300,270,age:(p-0.6)*3){card(c,0,0,680,220,ink);label(c,scriptText("C003"),340,100,82,cream,true);label(c,scriptText("C038"),340,40,30,mint,true)}}
        subtitle(c,u<5 ? [scriptText("C039")]:[scriptText("C040")])
        ticker(c,scriptText("C041"),u)
    } else {
        let u=t-52;heading(c,scriptText("C042"),scriptText("C043"))
        for i in 0..<6 {
            let p=ease((u-Double(i)*0.3)/3);let x=100+Double(i)*180
            sprite(c,"case",x,340+p*400,7,blue)
            if u>3 {sprite(c,"coin",x,275+sin(u*2+Double(i))*10,6,yellow)}
        }
        card(c,110,365,1060,164,yellow);label(c,scriptText("C044"),640,418,76,ink,true)
        card(c,110,198,1060,68,cream);label(c,scriptText("C045"),640,218,38,ink,true)
        confetti(c,u);subtitle(c,[scriptText("C046")])
        ticker(c,scriptText("C047"),u)
    }
}
func human(_ c:CGContext,_ t:Double) {
    picture(c,room,CGRect(x:0,y:0,width:1280,height:720))
    rect(c,0,0,1280,720,night.withAlphaComponent(0.32))
    // An explicit archive terminal replaces the powered-off public display.
    card(c,120,185,1040,420,night)
    rect(c,125,553,1030,46,color(0x273844));label(c,scriptText("C048"),147,567,24,paper)
    let u=t-71
    let messages:[(Double,Double,[String])] = [
        (0,5,[scriptText("C049"),scriptText("C050")]),
        (5,12,[scriptText("C051"),scriptText("C052")]),
        (12,18,[scriptText("C053"),scriptText("C054")]),
        (18,25,[scriptText("C055"),scriptText("C056")]),
        (25,31,[scriptText("C057"),scriptText("C058")]),
        (31,35,[scriptText("C059")]),
        (35,39,[scriptText("C060")]),
        (39,45,[scriptText("C061"),scriptText("C062")]),
        (45,50,[scriptText("C063"),scriptText("C064")])
    ]
    for (start,end,lines) in messages where u>=start && u<end {
        let age=u-start
        for (i,s) in lines.enumerated() {
            let n=min(s.count,max(0,Int((age-Double(i)*0.35)*32)))
            label(c,String(s.prefix(n)),160,429-Double(i)*64,34,paper)
        }
        if Int(t*2)%2==0 {rect(c,160,305,17,26,coral)}
    }
    if u<5 {
        sprite(c,"case",190,225,7,blue)
        label(c,scriptText("C065"),340,257,28,paper)
    } else if u<12 {
        let p=ease((u-5)/5)
        label(c,scriptText("C066"),240,275,28,paper,true)
        label(c,scriptText("C003"),980,275,28,mint,true)
        card(c,300+440*p,220,190,44,mint)
        label(c,scriptText("C067"),395+440*p,231,24,ink,true)
    } else if u<18 {
        sprite(c,"book",185,225,7,yellow)
        for i in 0..<4 {let p=clamp((u-12-Double(i)*0.6)/3);sprite(c,"paper",360+p*400,242,3,mint)}
        label(c,scriptText("C003"),950,275,28,mint,true)
        if u>14 {label(c,scriptText("C068"),650,205,26,coral,true)}
    } else if u<25 {
        label(c,scriptText("C069"),350,270,28,coral,true)
        label(c,scriptText("C070"),350,225,26,paper,true)
        chip(c,920,280,scriptText("C071"),blue,6)
        if u>21 {
            for i in 0..<12 {let q=(t*0.8+Double(i)/12).truncatingRemainder(dividingBy:1);rect(c,920+sin(Double(i)*1.7)*q*125,280+cos(Double(i)*1.7)*q*65,6,6,coral)}
            label(c,scriptText("C072"),680,205,24,coral,true)
        }
    } else if u<35 {
        if u<31 {
            sprite(c,"paper",190,220,7,mint)
            label(c,scriptText("C073"),650,270,28,mint,true)
            label(c,scriptText("C074"),650,225,24,paper,true)
        } else {
            card(c,210,220,860,70,ink)
            label(c,scriptText("C075"),640,244,32,mint,true)
        }
    } else if u<39 {
        label(c,scriptText("C076"),640,275,28,mint,true)
        let p=clamp((u-35)/2)
        for i in 0..<8 {rect(c,360+Double(i)*70,225,50,12,Double(i)/8<p ? mint:coral)}
    } else if u<45 {
        let age=u-39
        label(c,scriptText("C077"),390,275,26,mint,true)
        sprite(c,"book",350,205,5,mint)
        if age>2 {
            label(c,scriptText("C078"),500,220,22,mint,true)
            label(c,scriptText("C079"),875,275,26,coral,true)
            sprite(c,"paper",820,205,5,coral)
            for i in 0..<4 {rect(c,825,220+Double(i)*9,40,4,night)}
        }
    } else {
        label(c,scriptText("C080"),360,270,32,mint,true)
        label(c,scriptText("C070"),920,270,32,coral,true)
        label(c,scriptText("C081"),640,215,26,paper,true)
    }
    label(c,scriptText("C082"),640,115,22,coral,true)
}
func draw(_ c:CGContext,_ t:Double) {
    rect(c,0,0,1280,720,night)
    if t<64 {ad(c,t)}
    else if t<68 {
        // Pull back from the ad: it was playing on a physical screen all along.
        let p=ease((t-64)/2.2)
        let box=CGRect(x:278,y:210,width:726,height:379)
        // Move the camera from the display bounds to the whole room. Both the
        // room and the broadcast share this transform, keeping the screen fixed.
        let viewport=CGRect(x:box.minX*(1-p),y:box.minY*(1-p),
                            width:box.width+(1280-box.width)*p,
                            height:box.height+(720-box.height)*p)
        c.saveGState()
        c.scaleBy(x:1280/viewport.width,y:720/viewport.height)
        c.translateBy(x:-viewport.minX,y:-viewport.minY)
        picture(c,room,CGRect(x:0,y:0,width:1280,height:720))
        c.saveGState();c.clip(to:box);c.translateBy(x:box.minX,y:box.minY);c.scaleBy(x:box.width/1280,y:box.height/720);ad(c,63);c.restoreGState()
        if t>65.5 {
            let q=ease((t-65.5)/1.4);let x=1140-185*q,y=70+85*q
            sprite(c,"cursor",x,y,4,cream)
            if t>67.2 {rect(c,943,190,24,8,coral);label(c,scriptText("C083"),1010,185,20,paper)}
        }
        c.restoreGState()
    } else if t<71 {
        picture(c,room,CGRect(x:0,y:0,width:1280,height:720))
        rect(c,278,210,726,379,.black)
        if t<68.45 {let p=clamp((t-68)/0.45);rect(c,278,399.5-189.5*(1-p),726,379*(1-p),cream)}
        if t>69 {label(c,scriptText("C084"),640,80,34,paper,true)}
    } else if t<121 {human(c,t)}
    else {
        picture(c,room,CGRect(x:0,y:0,width:1280,height:720));rect(c,0,0,1280,720,night.withAlphaComponent(0.91))
        label(c,scriptText("C026"),640,510,64,mint,true)
        label(c,scriptText("C085"),640,390,54,paper,true)
        label(c,scriptText("C086"),640,283,34,paper,true)
        for i in 0..<8 {label(c,"\(1910+i*10)",190+Double(i)*128,160,24,i%2==0 ? mint:coral,true)}
    }
    if t>=68 {for i in stride(from:0,to:720,by:4) {rect(c,0,Double(i),1280,1,night.withAlphaComponent(0.08))}}
    let fade=min(1,t/0.3)*min(1,max(0,(duration-t)/0.4))
    if fade<1 {rect(c,0,0,1280,720,night.withAlphaComponent(1-fade))}
}
let qaSeconds=[2.0,12,24,36,48,59,66,69,74,81,87,94,100,104,109,112,115,119,124]
// A single real rendered frame, without touching the existing movie.
if let index=CommandLine.arguments.firstIndex(of:"--preview-at") {
    precondition(index+1<CommandLine.arguments.count,"Missing preview time")
    let second=Double(CommandLine.arguments[index+1])!
    precondition(second>=0 && second<duration,"Preview time outside film")
    let context=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
    draw(context,second)
    let target=CGImageDestinationCreateWithURL(out.appendingPathComponent("preview.png") as CFURL,"public.png" as CFString,1,nil)!
    CGImageDestinationAddImage(target,context.makeImage()!,nil)
    precondition(CGImageDestinationFinalize(target),"Preview write failed")
    print("Preview ready");exit(0)
}
if CommandLine.arguments.contains("--stills") {
    for t in qaSeconds {
        let c=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        draw(c,t)
        let d=CGImageDestinationCreateWithURL(out.appendingPathComponent("preview-\(Int(t)).png") as CFURL,"public.png" as CFString,1,nil)!
        CGImageDestinationAddImage(d,c.makeImage()!,nil);CGImageDestinationFinalize(d)
    }
    print("Preview frames ready");exit(0)
}
let final=out.appendingPathComponent("common-propaganda-v3-no-voice.mp4")
try? FileManager.default.removeItem(at:final)
let writer=try AVAssetWriter(outputURL:final,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:4_500_000,AVVideoMaxKeyFrameIntervalKey:48]])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
writer.add(input);guard writer.startWriting() else{fatalError(String(describing:writer.error))};writer.startSession(atSourceTime:.zero)
for f in 0..<Int(duration*Double(fps)) {
    while !input.isReadyForMoreMediaData {if writer.status == .failed {fatalError(String(describing:writer.error))};Thread.sleep(forTimeInterval:0.002)}
    autoreleasepool {
        var b:CVPixelBuffer?;CVPixelBufferPoolCreatePixelBuffer(nil,adaptor.pixelBufferPool!,&b)
        let buffer=b!;CVPixelBufferLockBaseAddress(buffer,[])
        let c=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
        draw(c,Double(f)/Double(fps));CVPixelBufferUnlockBaseAddress(buffer,[])
        guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else {fatalError("append failed")}
    }
    if f%240==0 {print("Rendered \(f)/\(Int(duration*Double(fps)))");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError(String(describing:writer.error))}
let result=AVURLAsset(url:final)
print("DONE \(final.path) duration=\(CMTimeGetSeconds(result.duration)) video=\(result.tracks(withMediaType:.video).count) audio=\(result.tracks(withMediaType:.audio).count)")
