import AppKit
import AVFoundation
import ImageIO
import CoreText
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
let requiredScriptIDs=["L001", "L002", "L003", "L004", "L005", "L006", "L007", "L008", "L009", "L010", "L011", "L012", "L013", "L014", "L015", "L016", "L017", "L018", "L019", "L020", "L021", "L022", "L023", "L024", "L025", "L026", "L027", "L028", "L029", "L030", "L031", "L032", "L033", "L034", "L035", "L036", "L037", "L038", "L039", "L040", "L041", "L042", "L043", "L044", "L045", "L046", "L047", "L048", "L049", "L050", "L051", "L052", "L053", "L054", "L055", "L056", "L057", "L058", "L059", "L060", "L061", "L062", "L063"]
for id in requiredScriptIDs {_ = scriptText(id)}
if CommandLine.arguments.contains("--dump-script") {
    let data=try JSONSerialization.data(withJSONObject:Dictionary(uniqueKeysWithValues:requiredScriptIDs.map{($0,scriptText($0))}),options:[.sortedKeys])
    print(String(data:data,encoding:.utf8)!);exit(0)
}
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let source = root.appendingPathComponent("assets/openings/luddite-pixel-v12/record-processing-room.png")
let art = CGImageSourceCreateImageAtIndex(CGImageSourceCreateWithURL(source as CFURL,nil)!,0,nil)!
let W=1280,H=720,fps:Int32=24,duration=79.0
let out=URL(fileURLWithPath:ProcessInfo.processInfo.environment["OPENING_OUTPUT_DIR"] ?? root.appendingPathComponent("output/openings/luddite-pixel-v12").path)
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
for file in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    let u=FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/\(file)")
    CTFontManagerRegisterFontsForURL(u as CFURL,.process,nil)
}

func readArt(_ path: String) -> CGImage {
    let url = root.appendingPathComponent("assets/openings/" + path)
    return CGImageSourceCreateImageAtIndex(CGImageSourceCreateWithURL(url as CFURL,nil)!,0,nil)!
}
let archives = readArt("luddite-pixel-v12/two-archives.png")
let half = archives.width / 2
let room = archives.cropping(to:CGRect(x:0,y:0,width:half,height:archives.height))!
let shelter = archives.cropping(to:CGRect(x:half,y:0,width:half,height:archives.height))!
let assignmentLibrary = readArt("guardian-v1/guardian-library.png")
let terminal = readArt("common-propaganda-v3/human-room.png")
let cyan=NSColor(calibratedRed:0.38,green:0.91,blue:0.86,alpha:1)
let red=NSColor(calibratedRed:1,green:0.35,blue:0.35,alpha:1)
let amber=NSColor(calibratedRed:1,green:0.76,blue:0.43,alpha:1)
let white=NSColor(calibratedWhite:0.95,alpha:1)
func fill(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {
    c.setFillColor(col.cgColor);c.fill(CGRect(x:x,y:y,width:w,height:h))
}
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
func text(_ c:CGContext,_ s:String,_ x:Double,_ y:Double,_ size:Double=33,_ col:NSColor=white,_ center:Bool=false) {
    let font=CTFontCreateWithName((size>=33 ? "Galmuri11-Bold":"Galmuri11") as CFString,size,nil)
    let a=NSAttributedString(string:s,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font,.foregroundColor:col])
    let line=CTLineCreateWithAttributedString(a)
    let width=CTLineGetTypographicBounds(line,nil,nil,nil)
    precondition(width <= 1180,"Text overflow: \(s) (\(width))")
    c.setShouldAntialias(false);c.setShouldSmoothFonts(false);c.textMatrix = .identity
    c.textPosition=CGPoint(x:round(center ? x-width/2:x),y:round(y));CTLineDraw(line,c)
}
func frame(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {
    fill(c,x,y,w,h,NSColor(calibratedWhite:0.015,alpha:0.93))
    fill(c,x,y,w,2,col);fill(c,x,y+h-2,w,2,col);fill(c,x,y,2,h,col);fill(c,x+w-2,y,2,h,col)
}
func message(_ c:CGContext,_ sourceLines:[String],_ speaker:String=scriptText("L001"),_ col:NSColor=cyan) {
    let lines=sourceLines.flatMap{copyLines($0,33,1110)}
    precondition(lines.count<=3,"Dialogue needs a longer scene or a different layout")
    let extra=Double(max(0,lines.count-2))*43
    frame(c,60,64,1160,150+extra,col.withAlphaComponent(0.6))
    text(c,speaker,85,180+extra,22,col)
    for (i,line) in lines.enumerated(){text(c,line,85,132+extra-Double(i)*43,33)}
}
func background(_ c:CGContext,_ image:CGImage,_ t:Double,_ shade:Double=0.45) {
    let z=1.0+0.018*sin(t*0.035)
    let w=1280*z,h=w*Double(image.height)/Double(image.width)
    c.setShouldAntialias(true);c.interpolationQuality = .none
    c.draw(image,in:CGRect(x:(1280-w)/2,y:(720-h)/2,width:w,height:h))
    fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:shade))
}
// Reveal two spaces rather than two identical abstract panels.
func imagePanel(_ c:CGContext,_ im:CGImage,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ anchor:Double,_ shade:Double) {
    c.saveGState();c.clip(to:CGRect(x:x,y:y,width:w,height:h))
    let scale=max(w/Double(im.width),h/Double(im.height))*1.025
    let iw=Double(im.width)*scale,ih=Double(im.height)*scale
    c.setShouldAntialias(true);c.interpolationQuality = .none
    c.draw(im,in:CGRect(x:x+(w-iw)*anchor,y:y+(h-ih)*0.5,width:iw,height:ih))
    fill(c,x,y,w,h,NSColor(calibratedWhite:0,alpha:shade))
    c.restoreGState()
}
func worlds(_ c:CGContext,_ t:Double,_ reveal:Double=1) {
    background(c,room,t,0.70)
    c.saveGState();c.setAlpha(reveal)
    imagePanel(c,room,0,222,632,453,0.98,0.26)
    imagePanel(c,shelter,648,222,632,453,0.65,0.17)
    fill(c,632,222,16,453,NSColor(calibratedWhite:0.005,alpha:1))
    fill(c,635,222,2,453,cyan.withAlphaComponent(0.5))
    fill(c,643,222,2,453,amber.withAlphaComponent(0.6))
    // Shade only under labels, preserving the actual server racks and books.
    fill(c,0,490,632,110,NSColor(calibratedWhite:0,alpha:0.50))
    fill(c,648,490,632,110,NSColor(calibratedWhite:0,alpha:0.50))
    c.restoreGState()
}
func paperRecord(_ c:CGContext,_ x:Double,_ y:Double,_ status:String) {
    fill(c,x+10,y-7,390,174,NSColor(calibratedRed:0.24,green:0.16,blue:0.10,alpha:0.85))
    let paper=NSColor(calibratedRed:0.86,green:0.78,blue:0.61,alpha:0.94)
    let ink=NSColor(calibratedRed:0.17,green:0.10,blue:0.075,alpha:1)
    fill(c,x,y,390,174,paper)
    fill(c,x+15,y+16,3,140,ink.withAlphaComponent(0.25))
    text(c,status,x+30,y+140,22,ink)
    text(c,scriptText("L002"),x+30,y+89,33,ink)
    text(c,scriptText("L003"),x+30,y+47,22,ink)
    for k in 0..<3 {fill(c,x+220,y+40+Double(k)*9,115-Double(k)*17,1,ink.withAlphaComponent(0.25))}
}
func record(_ c:CGContext,_ x:Double,_ y:Double,_ title:String=scriptText("L002"),_ status:String=scriptText("L004"),_ col:NSColor=cyan,_ corrupted:Bool=false) {
    frame(c,x,y,390,196,col)
    text(c,status,x+20,y+155,22,col)
    text(c,title,x+20,y+101,33)
    text(c,scriptText("L003"),x+20,y+58,22)
    for i in 0..<3 {fill(c,x+20,y+22+Double(i)*7,Double(205-i*30),2,col.withAlphaComponent(0.35))}
    if corrupted {
        fill(c,x+16,y+90,355,31,NSColor(calibratedWhite:0.01,alpha:1))
        text(c,scriptText("L005"),x+20,y+96,22,red)
    }
}
func link(_ c:CGContext,_ p:Double,_ col:NSColor=cyan,_ reverse:Bool=false) {
    fill(c,484,400,310,2,col.withAlphaComponent(0.4))
    for i in 0..<8 {
        let q=(p*1.6+Double(i)/8).truncatingRemainder(dividingBy:1)
        let x=484+310*(reverse ? 1-q:q)
        fill(c,x,393,8,16,col.withAlphaComponent(0.2+q*0.7))
    }
}
func staticNoise(_ c:CGContext,_ t:Double,_ strength:Double) {
    var seed=UInt64(Int(t*24)+2030)
    func r()->Double{seed=seed &* 6364136223846793005 &+ 1;return Double(seed>>33)/Double(UInt64.max>>33)}
    for _ in 0..<800 {
        let x=floor(r()*640)*2,y=floor(r()*310)*2+50
        fill(c,x,y,r()>0.98 ? 18:2,2,NSColor(calibratedWhite:r()>0.5 ? 1:0,alpha:r()*0.16*strength))
    }
    for y in stride(from:50,to:670,by:3){fill(c,0,Double(y),1280,1,NSColor(calibratedWhite:0,alpha:0.08))}
    let f=Int(t*24)
    if strength>0.7 && f%47<2 {fill(c,0,Double(230+(f*7)%350),1280,5,cyan.withAlphaComponent(0.14))}
}
let sceneTimes:[(Double,String)]=[(0,"01-normal"),(4,"02-contact"),(10,"03-memory"),(21,"04-backup"),(33,"05-contaminate"),(45,"06-guardian"),(57,"07-read"),(65,"08-main-line"),(73,"09-end")]
// Fit the original artwork by its visible bounds, with equal margins on both sides.
func humanArt(_ c:CGContext,_ image:CGImage,_ box:CGRect) {
    let scale=min(box.width/CGFloat(image.width),box.height/CGFloat(image.height))
    let w=CGFloat(image.width)*scale,h=CGFloat(image.height)*scale
    c.saveGState();c.interpolationQuality = .high
    c.draw(image,in:CGRect(x:box.midX-w/2,y:box.midY-h/2,width:w,height:h));c.restoreGState()
}
func normalTerminal(_ c:CGContext,_ t:Double) {
    background(c,assignmentLibrary,t,0.19)
    frame(c,220,185,840,385,cyan)
    humanArt(c,humanMark,CGRect(x:278,y:459,width:80,height:76))
    text(c,scriptText("L006"),640,490,44,white,true)
    text(c,scriptText("L007"),640,438,22,cyan,true)
    text(c,scriptText("L008"),640,343,33,white,true)
    let p=min(0.87,t/3*0.87)
    fill(c,340,285,600,6,white.withAlphaComponent(0.2));fill(c,340,285,600*p,6,cyan)
    text(c,String(format:"%02d%%",Int(p*100)),970,277,22,cyan)
    text(c,scriptText("L009"),640,225,22,cyan,true)
}
let humanMark = readArt("identity/human-mark.png")
let ludditeMark = readArt("identity/luddite-mark.png")
func emblem(_ c:CGContext,_ x:Double,_ y:Double,_ scale:Double=1) {
    let side = 224*scale
    c.saveGState();c.interpolationQuality = .none
    c.draw(ludditeMark,in:CGRect(x:x-side/2,y:y-side/2,width:side,height:side));c.restoreGState()
}
func takeoverNoise(_ c:CGContext,_ t:Double,_ strength:Double) {
    staticNoise(c,t,3*strength)
    let f=Int(t*24)
    for i in 0..<24 {
        let x=Double((f*61+i*127)%1280),y=Double(55+(f*17+i*71)%600)
        fill(c,x,y,Double(24+(i*31)%240),Double(2+i%4),red.withAlphaComponent(0.18*strength))
    }
    let y=Double(160+(f*13)%390)
    fill(c,0,y,1280,13,red.withAlphaComponent(0.12*strength))
}
func polygon(_ c:CGContext,_ pts:[CGPoint],_ color:NSColor) {
    guard let first=pts.first else{return}
    c.beginPath();c.move(to:first)
    for p in pts.dropFirst(){c.addLine(to:p)}
    c.closePath();c.setFillColor(color.cgColor);c.fillPath()
}
func machineScene(_ c:CGContext,_ t:Double) {
    c.saveGState(); defer { c.restoreGState() }
    let width=Double(art.width),height=Double(art.height)
    c.scaleBy(x:1280/width,y:720/height)
    func box(_ x:Double,_ y:Double,_ w:Double,_ h:Double)->CGRect {
        CGRect(x:x,y:height-y-h,width:w,height:h)
    }
    c.interpolationQuality = .none
    c.draw(art,in:box(0,0,width,height))
    func patch(_ x:Int,_ y:Int,_ w:Int,_ h:Int,_ dx:Double,_ dy:Double) {
        let tile=art.cropping(to:CGRect(x:x,y:y,width:w,height:h))!
        c.draw(tile,in:box(dx,dy,Double(w),Double(h)))
    }
    // Clear the original sheet and repeat a clean section of the belt.
    let travel = max(0,min(1,(t-5.6)/4.1))
    let offset = Int(travel*910)%120
    c.saveGState()
    c.clip(to:box(235,627,980,48))
    for i in -1...9 {patch(640,627,120,48,235+Double(i*120+offset),627)}
    c.restoreGState()
    patch(540,609,200,18,316,609)
    c.saveGState()
    // The near wall of the intake occludes the sheet across its full depth.
    let intakeX = 1219.0
    c.clip(to:box(230,590,intakeX-230,92))
    c.translateBy(x:floor(travel*1030),y:0)
    let points=[(317,665),(368,614),(510,609),(473,661),(455,669)]
    c.beginPath()
    for (i,p) in points.enumerated() {
        let pt=CGPoint(x:Double(p.0),y:height-Double(p.1))
        if i==0 {c.move(to:pt)} else {c.addLine(to:pt)}
    }
    c.closePath();c.clip();c.draw(art,in:box(0,0,width,height));c.restoreGState()
    for row in 0..<8 {
        for x in [890,1053,1214] {
            let lit=t>3.1+Double(7-row)*0.24
            c.setFillColor((lit ? NSColor.systemGreen:NSColor.darkGray).cgColor)
            c.fill(box(Double(x-6),Double(104+row*42),12,12))
        }
    }
    if t>0.6 && t<4.5 {
        let path=[(349.0,608.0),(349,270),(602,270),(663,116),(748,116)]
        for i in 0..<8 {
            let phase=(t*1.2+Double(i)/2).truncatingRemainder(dividingBy:4)
            let k=Int(phase),f=phase-Double(k)
            let x=path[k].0*(1-f)+path[k+1].0*f,y=path[k].1*(1-f)+path[k+1].1*f
            let glyph=i%2==0 ? ["111","101","101","101","111"]:["010","110","010","010","111"]
            c.setFillColor(NSColor.cyan.cgColor)
            for (r,line) in glyph.enumerated(){for (j,b) in line.enumerated() where b=="1"{c.fill(box(x+Double(j*3),y+Double(r*3),3,3))}}
        }
    }
    let intakeTime = 5.6 + (intakeX-510)/1030*4.1
    if t > intakeTime {
        for (x,r) in [(1337,46),(1445,45)] {
            c.saveGState()
            let rect=box(Double(x-r),Double(645-r),Double(2*r),Double(2*r))
            c.addEllipse(in:rect);c.clip();c.translateBy(x:rect.midX,y:rect.midY)
            c.rotate(by:(t-intakeTime)*(x==1337 ? 3 : -3));c.translateBy(x:-rect.midX,y:-rect.midY)
            c.draw(art,in:box(0,0,width,height));c.restoreGState()
        }
        for i in 0..<16 {
            let drop=((t-intakeTime)*90+Double(i*13)).truncatingRemainder(dividingBy:45)
            c.setFillColor(NSColor.wheatPaper.cgColor);c.fill(box(Double(1320+i*9),689+drop,4,9))
        }
    }
}
extension NSColor {static let wheatPaper=NSColor(calibratedRed:0.97,green:0.82,blue:0.59,alpha:1)}
func blockingWindows(_ c:CGContext,_ u:Double) {
    let n=min(29,1+Int((u-4)*23))
    // Independent, deterministic random coordinates avoid diagonal cascades and grids.
    var seed:UInt64=731924
    func r()->Double{seed=seed &* 6364136223846793005 &+ 1442695040888963407;return Double(seed>>33)/Double(UInt64.max>>33)}
    for i in 0..<max(0,n) {
        let x=r()*1160-170,y=r()*650-50
        let scale=0.83+r()*0.28
        let fresh=max(0,1-(u-4-Double(i)/23)*5)
        c.saveGState();c.translateBy(x:x,y:y);c.scaleBy(x:scale,y:scale)
        frame(c,0,0,465,146,red)
        fill(c,2,111,461,33,red.withAlphaComponent(0.30+fresh*0.25))
        text(c,scriptText("L010"),14,119,22,red)
        text(c,scriptText("L011"),429,119,22,red)
        text(c,scriptText("L012"),18,71,33,white)
        text(c,scriptText("L013"),18,25,22,red)
        c.restoreGState()
    }
}
func draw(_ c:CGContext,_ elapsed:Double) {
    let t=elapsed>=14 ? elapsed-4:elapsed
    fill(c,0,0,1280,720,.black)
    if elapsed<14 {
        let u=elapsed
        if u<5.6 {
            normalTerminal(c,min(u,3))
            if u>=3 {
                fill(c,410,320,410,42,NSColor(calibratedRed:0.015,green:0.04,blue:0.055,alpha:1))
                text(c,Int(u*8)%3==0 ? scriptText("L014") : scriptText("L015"),640,343,33,white,true)
                fill(c,Double(300+Int(u*95)%650),390,13,25,cyan)
                takeoverNoise(c,u,0.45)
            }
            if u>=4 {
                blockingWindows(c,u)
            }
            if u>=5 {
                fill(c,100,318,1080,61,NSColor(calibratedWhite:0.01,alpha:1))
                text(c,scriptText("L016"),640,337,44,red,true)
                fill(c,0,Int(u*24)%2==0 ? 438:278,1280,6,red.withAlphaComponent(0.6))
            }
        } else if u<9.2 {
            // The existing HUMAN interface is visibly displaced, then buried.
            c.saveGState();c.translateBy(x:Double(Int(u*40)%3-1)*11,y:0)
            normalTerminal(c,3);blockingWindows(c,5.55);c.restoreGState()
            fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:0.94))
            let s=u<6.8 ? 1.3:0.4
            takeoverNoise(c,u,s)
            if u>=6 {
                let offset=u<6.8 ? Double(Int(u*24)%3-1)*15:0
                emblem(c,640+offset,425,1)
                text(c,scriptText("L017"),640-offset,234,66,red,true)
                text(c,scriptText("L018"),640,177,22,red,true)
            }
        } else {
            background(c,room,u,0.76)
            // Persistent pieces of the interrupted interface remain under the takeover.
            c.saveGState();c.clip(to:CGRect(x:0,y:460,width:330,height:230))
            text(c,scriptText("L006"),240,490,44,white.withAlphaComponent(0.2),true)
            c.restoreGState()
            fill(c,70,460,330,3,cyan.withAlphaComponent(0.2));fill(c,70,460,287,3,red.withAlphaComponent(0.45))
            text(c,scriptText("L019"),73,424,22,red.withAlphaComponent(0.7))
            emblem(c,640,425,0.65)
            text(c,scriptText("L020"),640,288,22,red,true)
            message(c,u<11.5 ? [scriptText("L021"),scriptText("L022")]:[scriptText("L023"),scriptText("L024")],scriptText("L025"),red)
            takeoverNoise(c,u,0.12)
        }
    } else if t<21 {
        machineScene(c,t-10)
        // The spoken-to-player text sits beneath the process, without a lecture heading.
        let subtitleColors=[NSColor(calibratedWhite:0,alpha:0.78).cgColor,NSColor(calibratedWhite:0,alpha:0).cgColor] as CFArray
        if let g=CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:subtitleColors,locations:[0,1]) {
            c.drawLinearGradient(g,start:CGPoint(x:0,y:45),end:CGPoint(x:0,y:245),options:[])
        }
        if t<15.2 {
            text(c,scriptText("L026"),78,142,33,white)
            text(c,scriptText("L027"),78,89,33,white)
        } else {
            for (i,line) in copyLines(scriptText("L028"),33,1124).enumerated() {text(c,line,78,142-Double(i)*48,33,amber)}
        }
    } else if t<33 {
        worlds(c,t,min(1,(t-21)/1.4))
        text(c,scriptText("L029"),316,550,33,cyan,true)
        text(c,scriptText("L030"),964,550,33,amber,true)
        text(c,scriptText("L031"),640,238,22,white,true)
        record(c,75,283)
        let p=min(1,max(0,(t-22)/6.0))
        if p<1 {
            link(c,p)
            c.saveGState();c.setAlpha(p)
            record(c,75+740*p,283,scriptText("L002"),scriptText("L032"),cyan)
            c.restoreGState()
        } else {paperRecord(c,815,283,scriptText("L033"))}
        if t<27.5 {message(c,[scriptText("L034"),scriptText("L035")])}
        else {message(c,[scriptText("L036"),scriptText("L037")])}
    } else if t<45 {
        worlds(c,t)
        text(c,scriptText("L029"),316,550,33,red,true)
        text(c,scriptText("L030"),964,550,33,amber,true)
        text(c,scriptText("L038"),640,238,22,red,true)
        record(c,75,283,scriptText("L002"),scriptText("L039"),red,true)
        paperRecord(c,815,283,scriptText("L040"))
        let f=Int(t*24)
        for i in 0..<7 {fill(c,90+Double((f*13+i*43)%280),309+Double(i)*21,70,3,red.withAlphaComponent(0.65))}
        if t<38.2 {message(c,[scriptText("L041"), scriptText("L042")],scriptText("L001"),red)}
        else {message(c,[scriptText("L043"), scriptText("L044")])}
    } else if t<57 {
        worlds(c,t)
        text(c,scriptText("L045"),316,550,33,cyan,true)
        text(c,scriptText("L046"),964,550,33,amber,true)
        let p=min(1,max(0,(t-46)/5))
        record(c,75,283,scriptText("L002"),p<1 ? scriptText("L047"):scriptText("L048"),cyan,p<1)
        paperRecord(c,815,283,scriptText("L049"))
        fill(c,95,265,350,4,white.withAlphaComponent(0.2));fill(c,95,265,350*p,4,cyan)
        if t<50.8 {message(c,[scriptText("L050"),scriptText("L051")])}
        else {message(c,[scriptText("L052"), scriptText("L053")])}
    } else if t<65 {
        background(c,shelter,t,0.62)
        text(c,scriptText("L054"),640,555,33,amber,true)
        record(c,445,290,scriptText("L002"),scriptText("L055"),amber)
        if t<60.5 {message(c,[scriptText("L056")],scriptText("L001"),amber)}
        else {message(c,[scriptText("L057"), scriptText("L058")],scriptText("L001"),amber)}
    } else if t<73 {
        background(c,terminal,t,0.32)
        text(c,scriptText("L059"),640,420,44,white,true)
        if t>=66.5 {text(c,scriptText("L060"),640,347,44,white,true)}
        if t>=68.3 {text(c,scriptText("L061"),640,274,44,cyan,true)}
    } else {
        fill(c,0,0,1280,720,NSColor(calibratedRed:0.01,green:0.025,blue:0.03,alpha:1))
        text(c,scriptText("L017"),640,370,66,white,true)
        text(c,scriptText("L062"),640,303,22,cyan,true)
    }
    if elapsed>=14 && t<65 {staticNoise(c,t,t>=65 ? 0.2:t<10 ? 1:0.55)}
    fill(c,0,0,1280,45,.black);fill(c,0,675,1280,45,.black)
    if elapsed>=14 && t<65 {text(c,scriptText("L063"),64,645,22,red)}
    let fade=min(1,elapsed/0.6)*min(1,max(0,(79-elapsed)/0.6))
    if fade<1{fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:1-fade))}
}
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
let final=out.appendingPathComponent("luddite-pixel-v12.mp4")
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
