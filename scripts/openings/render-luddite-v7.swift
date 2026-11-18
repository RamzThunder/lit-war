import Foundation
import AVFoundation
import AppKit
import CoreText
import ImageIO

let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/luddite-v7")
let assets=out.appendingPathComponent("assets")
let W=1280,H=720,fps:Int32=24,duration=79.0
for file in ["Galmuri11.ttf","Galmuri11-Bold.ttf"] {
    let u=FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Fonts/\(file)")
    CTFontManagerRegisterFontsForURL(u as CFURL,.process,nil)
}
func loadImage(_ name:String)->CGImage {
    let s=CGImageSourceCreateWithURL(assets.appendingPathComponent(name) as CFURL,nil)!
    return CGImageSourceCreateImageAtIndex(s,0,nil)!
}
let room=loadImage("archive-room.png"),memory=loadImage("human-memory.png"),shelter=loadImage("resistance-archive.png")
let cyan=NSColor(calibratedRed:0.38,green:0.91,blue:0.86,alpha:1)
let red=NSColor(calibratedRed:1,green:0.35,blue:0.35,alpha:1)
let amber=NSColor(calibratedRed:1,green:0.76,blue:0.43,alpha:1)
let white=NSColor(calibratedWhite:0.95,alpha:1)
func fill(_ c:CGContext,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ col:NSColor) {
    c.setFillColor(col.cgColor);c.fill(CGRect(x:x,y:y,width:w,height:h))
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
func message(_ c:CGContext,_ lines:[String],_ speaker:String="외부 접선자",_ col:NSColor=cyan) {
    frame(c,60,64,1160,150,col.withAlphaComponent(0.6))
    text(c,speaker,85,180,22,col)
    for (i,line) in lines.enumerated(){text(c,line,85,132-Double(i)*43,33)}
}
func background(_ c:CGContext,_ image:CGImage,_ t:Double,_ shade:Double=0.45) {
    let z=1.0+0.018*sin(t*0.035)
    let w=1280*z,h=w*Double(image.height)/Double(image.width)
    c.setShouldAntialias(true);c.interpolationQuality = .high
    c.draw(image,in:CGRect(x:(1280-w)/2,y:(720-h)/2,width:w,height:h))
    fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:shade))
}
// Reveal two spaces rather than two identical abstract panels.
func imagePanel(_ c:CGContext,_ im:CGImage,_ x:Double,_ y:Double,_ w:Double,_ h:Double,_ anchor:Double,_ shade:Double) {
    c.saveGState();c.clip(to:CGRect(x:x,y:y,width:w,height:h))
    let scale=max(w/Double(im.width),h/Double(im.height))*1.025
    let iw=Double(im.width)*scale,ih=Double(im.height)*scale
    c.setShouldAntialias(true);c.interpolationQuality = .high
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
    text(c,"동백꽃",x+30,y+89,33,ink)
    text(c,"김유정  /  1936",x+30,y+47,22,ink)
    for k in 0..<3 {fill(c,x+220,y+40+Double(k)*9,115-Double(k)*17,1,ink.withAlphaComponent(0.25))}
}
func record(_ c:CGContext,_ x:Double,_ y:Double,_ title:String="동백꽃",_ status:String="원본",_ col:NSColor=cyan,_ corrupted:Bool=false) {
    frame(c,x,y,390,196,col)
    text(c,status,x+20,y+155,22,col)
    text(c,title,x+20,y+101,33)
    text(c,"김유정  /  1936",x+20,y+58,22)
    for i in 0..<3 {fill(c,x+20,y+22+Double(i)*7,Double(205-i*30),2,col.withAlphaComponent(0.35))}
    if corrupted {
        fill(c,x+16,y+90,355,31,NSColor(calibratedWhite:0.01,alpha:1))
        text(c,"[기록 데이터 변조됨]",x+20,y+96,22,red)
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
func normalTerminal(_ c:CGContext,_ t:Double) {
    fill(c,0,0,1280,720,NSColor(calibratedRed:0.015,green:0.04,blue:0.055,alpha:1))
    text(c,"HUMAN ARCHIVE",640,490,44,white,true)
    text(c,"기록 보관 시스템",640,438,22,cyan,true)
    text(c,"사용자 확인 완료. 기록실을 배정합니다.",640,343,33,white,true)
    let p=min(0.87,t/3*0.87)
    fill(c,340,285,600,6,white.withAlphaComponent(0.2));fill(c,340,285,600*p,6,cyan)
    text(c,String(format:"%02d%%",Int(p*100)),970,277,22,cyan)
    text(c,"1910 — 1980  /  문학 기록실",640,225,22,cyan,true)
}
// Temporary faction mark: a broken enclosure and an angular L cut by a slash.
func emblem(_ c:CGContext,_ x:Double,_ y:Double,_ scale:Double=1,_ color:NSColor=red) {
    c.saveGState();c.translateBy(x:x,y:y);c.scaleBy(x:scale,y:scale)
    c.setShouldAntialias(false);c.setStrokeColor(color.cgColor);c.setLineWidth(12)
    c.setLineCap(.square);c.setLineJoin(.miter)
    c.move(to:CGPoint(x:-45,y:112));c.addLine(to:CGPoint(x:-108,y:78));c.addLine(to:CGPoint(x:-108,y:-74));c.addLine(to:CGPoint(x:-44,y:-112));c.strokePath()
    c.move(to:CGPoint(x:45,y:-112));c.addLine(to:CGPoint(x:108,y:-78));c.addLine(to:CGPoint(x:108,y:74));c.addLine(to:CGPoint(x:44,y:112));c.strokePath()
    fill(c,-43,-56,23,123,color);fill(c,-43,-56,98,23,color)
    c.setLineWidth(13);c.move(to:CGPoint(x:2,y:-89));c.addLine(to:CGPoint(x:64,y:94));c.strokePath()
    c.restoreGState()
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
func machineScene(_ c:CGContext,_ u:Double) {
    let dark=NSColor(calibratedRed:0.012,green:0.019,blue:0.023,alpha:1)
    fill(c,0,0,1280,720,dark)
    let colors=[NSColor(calibratedRed:0.045,green:0.14,blue:0.15,alpha:1).cgColor,dark.cgColor] as CFArray
    if let g=CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:colors,locations:[0,1]) {
        c.drawRadialGradient(g,startCenter:CGPoint(x:945,y:445),startRadius:10,endCenter:CGPoint(x:945,y:445),endRadius:530,options:[])
    }
    // A physical intake, faceted machine body and paper conveyor. No diagram boxes.
    polygon(c,[CGPoint(x:757,y:300),CGPoint(x:1106,y:300),CGPoint(x:1200,y:360),CGPoint(x:1200,y:608),CGPoint(x:850,y:608),CGPoint(x:757,y:548)],NSColor(calibratedRed:0.075,green:0.10,blue:0.11,alpha:1))
    polygon(c,[CGPoint(x:1106,y:300),CGPoint(x:1200,y:360),CGPoint(x:1200,y:608),CGPoint(x:1106,y:548)],NSColor(calibratedRed:0.045,green:0.060,blue:0.065,alpha:1))
    polygon(c,[CGPoint(x:757,y:548),CGPoint(x:1106,y:548),CGPoint(x:1200,y:608),CGPoint(x:850,y:608)],NSColor(calibratedRed:0.12,green:0.15,blue:0.16,alpha:1))
    text(c,"HUMAN",930,560,44,white.withAlphaComponent(0.8),true)
    fill(c,792,439,286,91,NSColor(calibratedWhite:0.008,alpha:1))
    let titles=["동백꽃","광장","무정","원미동 사람들"]
    let current=Int(u/2.6)%titles.count
    text(c,titles[current],815,488,22,cyan)
    for i in 0..<7 {
        let w=Double(30+(i*41+Int(u*10))%185)
        fill(c,815,454+Double(i)*4,w,1,cyan.withAlphaComponent(i%2==0 ? 0.6:0.2))
    }
    fill(c,735,365,377,61,NSColor(calibratedWhite:0.006,alpha:1))
    for i in 0..<7 {
        fill(c,755+Double(i)*47,371,25,7,NSColor(calibratedWhite:0.13,alpha:1))
        fill(c,757+Double(i)*47+sin(u*12)*2,372,9,5,NSColor(calibratedWhite:0.22,alpha:1))
    }
    polygon(c,[CGPoint(x:80,y:319),CGPoint(x:743,y:319),CGPoint(x:806,y:365),CGPoint(x:143,y:365)],NSColor(calibratedWhite:0.075,alpha:1))
    for i in 0..<20 {
        let x=90+Double(i)*35+(u*48).truncatingRemainder(dividingBy:35)
        fill(c,x,322,2,36,NSColor(calibratedWhite:0.12,alpha:1))
    }
    // Each document physically enters the throat before disappearing from view.
    c.saveGState();c.clip(to:CGRect(x:0,y:320,width:789,height:270))
    for i in -2..<5 {
        let phase=u*0.385-Double(i)
        let x=30+phase*355
        if x < -180 || x > 960 {continue}
        c.saveGState();c.translateBy(x:x,y:410+sin(Double(i)*1.9)*14)
        c.rotate(by:sin(Double(i)*3.2)*0.08*(1-min(1,max(0,x/790))))
        fill(c,-103,-71,206,142,NSColor(calibratedWhite:0,alpha:0.6))
        fill(c,-100,-66,200,132,NSColor(calibratedRed:0.84,green:0.81,blue:0.70,alpha:1))
        let ink=NSColor(calibratedRed:0.16,green:0.15,blue:0.13,alpha:1)
        text(c,titles[(i+titles.count*2)%titles.count],-82,24,22,ink)
        for row in 0..<7 {fill(c,-81,-43+Double(row)*7,Double(120+(row*17)%46),1,ink.withAlphaComponent(0.35))}
        c.restoreGState()
    }
    c.restoreGState()
    // Scanning captures the information; paper exits as torn strips.
    fill(c,787,370,3,125,red.withAlphaComponent(0.8))
    fill(c,780,370,17,125,red.withAlphaComponent(0.10))
    fill(c,830,287,245,13,NSColor(calibratedWhite:0.002,alpha:1))
    for i in 0..<46 {
        let p=(u*0.57+Double(i)*0.173).truncatingRemainder(dividingBy:1)
        let x=834+Double((i*31)%235)+sin(p*8+Double(i))*13
        let y=290-p*131
        c.saveGState();c.translateBy(x:x,y:y);c.rotate(by:sin(p*6+Double(i))*0.23)
        fill(c,0,0,Double(3+i%4),Double(22+i%23),NSColor(calibratedRed:0.72,green:0.69,blue:0.60,alpha:min(0.88,(1-p)*1.6)))
        fill(c,1,5,1,13,NSColor(calibratedWhite:0.2,alpha:0.6))
        c.restoreGState()
    }
    // Small incoming piles stand for the many human-authored documents.
    for i in 0..<10 {
        fill(c,50+Double(i%3)*5,325+Double(i)*4,157,3,NSColor(calibratedRed:0.62,green:0.60,blue:0.53,alpha:1))
    }
    for i in 0..<60 {
        let x=Double((i*197)%1280),y=Double((i*89)%670)+sin(u+Double(i))*5
        fill(c,x,y,1,1,white.withAlphaComponent(0.08))
    }
}
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
        text(c,"HUMAN / SECURITY",14,119,22,red)
        text(c,"×",429,119,22,red)
        text(c,"비인가 연결 차단 중",18,71,33,white)
        text(c,"외부 입력 거부 / 재시도",18,25,22,red)
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
                text(c,Int(u*8)%3==0 ? "記録 // _ _ _" : "기록실 배정 중_",640,343,33,white,true)
                fill(c,Double(300+Int(u*95)%650),390,13,25,cyan)
                takeoverNoise(c,u,0.45)
            }
            if u>=4 {
                blockingWindows(c,u)
            }
            if u>=5 {
                fill(c,100,318,1080,61,NSColor(calibratedWhite:0.01,alpha:1))
                text(c,"그 안내는 무시해.",640,337,44,red,true)
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
                emblem(c,640+offset,425,1,red)
                text(c,"L U D D I T E",640-offset,234,66,red,true)
                text(c,"통제권을 되찾는 중",640,177,22,red,true)
            }
        } else {
            background(c,room,u,0.76)
            // Persistent pieces of the interrupted interface remain under the takeover.
            c.saveGState();c.clip(to:CGRect(x:0,y:460,width:330,height:230))
            text(c,"HUMAN ARCHIVE",240,490,44,white.withAlphaComponent(0.2),true)
            c.restoreGState()
            fill(c,70,460,330,3,cyan.withAlphaComponent(0.2));fill(c,70,460,287,3,red.withAlphaComponent(0.45))
            text(c,"87% / 배정 중단",73,424,22,red.withAlphaComponent(0.7))
            emblem(c,640,425,0.65,red)
            text(c,"LUDDITE / 외부 채널 확보",640,288,22,red,true)
            message(c,u<11.5 ? ["연결됐네.","길게 말할 시간은 없어."]:["이 채널은 HUMAN의 안내 방송이 아니야.","네게 맡길 일이 있어."],"러다이트 / 외부 접선자",red)
            takeoverNoise(c,u,0.12)
        }
    } else if t<21 {
        machineScene(c,t-10)
        // The spoken-to-player text sits beneath the process, without a lecture heading.
        fill(c,0,45,1280,145,NSColor(calibratedWhite:0.006,alpha:0.76))
        if t<15.2 {
            text(c,"저 안에 있는 건",78,142,33,white)
            text(c,"기계가 만든 기억이 아니야.",78,89,33,white)
        } else {
            text(c,"사람이 살고, 쓰고, 남긴 거지.",78,126,33,amber)
        }
    } else if t<33 {
        worlds(c,t,min(1,(t-21)/1.4))
        text(c,"HUMAN 아카이브",316,550,33,cyan,true)
        text(c,"인간의 외부 저장소",964,550,33,amber,true)
        text(c,"진짜 기록을 밖으로",640,238,22,white,true)
        record(c,75,283)
        let p=min(1,max(0,(t-22)/6.0))
        if p<1 {
            link(c,p)
            c.saveGState();c.setAlpha(p)
            record(c,75+740*p,283,"동백꽃","전송 중",cyan)
            c.restoreGState()
        } else {paperRecord(c,815,283,"외부 백업 / 원본 보존")}
        if t<27.5 {message(c,["먼저 진짜 기록을 밖으로 옮겨.","한 글자도 잃지 않게."])}
        else {message(c,["외부 백업을 확보했어.","진짜 기록은 우리에게 남아 있어."])}
    } else if t<45 {
        worlds(c,t)
        text(c,"HUMAN 아카이브",316,550,33,red,true)
        text(c,"인간의 외부 저장소",964,550,33,amber,true)
        text(c,"HUMAN의 사본만 오염",640,238,22,red,true)
        record(c,75,283,"동백꽃","오염 / 변조됨",red,true)
        paperRecord(c,815,283,"백업 안전 / 원본 보존")
        let f=Int(t*24)
        for i in 0..<7 {fill(c,90+Double((f*13+i*43)%280),309+Double(i)*21,70,3,red.withAlphaComponent(0.65))}
        if t<38.2 {message(c,["백업을 확보한 뒤,", "HUMAN이 가진 기록을 오염시켜."],"외부 접선자",red)}
        else {message(c,["우리가 지키는 건 기록이고,", "무너뜨릴 건 독점이야."])}
    } else if t<57 {
        worlds(c,t)
        text(c,"GUARDIAN / 정화",316,550,33,cyan,true)
        text(c,"LUDDITE / 백업 보유",964,550,33,amber,true)
        let p=min(1,max(0,(t-46)/5))
        record(c,75,283,"동백꽃",p<1 ? "정화 중":"정화 완료 / 원본 복구",cyan,p<1)
        paperRecord(c,815,283,"외부 원본 보존")
        fill(c,95,265,350,4,white.withAlphaComponent(0.2));fill(c,95,265,350*p,4,cyan)
        if t<50.8 {message(c,["보존관은 복구할 거야.","그들에게도 지켜야 할 이유가 있으니까."])}
        else {message(c,["하지만 우린 이 기록을", "HUMAN에게만 맡겨 둘 수 없어."])}
    } else if t<65 {
        background(c,shelter,t,0.62)
        text(c,"다음 기록에 접속할 준비",640,555,33,amber,true)
        record(c,445,290,"동백꽃","읽기 / 원본 확인",amber)
        if t<60.5 {message(c,["기록을 읽어."],"외부 접선자",amber)}
        else {message(c,["진짜를 알아야,", "무엇을 바꿀지도 알 수 있어."],"외부 접선자",amber)}
    } else if t<73 {
        background(c,room,t,0.78)
        text(c,"우리가 남길 것은,",640,420,44,white,true)
        if t>=66.5 {text(c,"누구의 허락도 필요 없는",640,347,44,white,true)}
        if t>=68.3 {text(c,"인간의 기록이야.",640,274,44,cyan,true)}
    } else {
        fill(c,0,0,1280,720,NSColor(calibratedRed:0.01,green:0.025,blue:0.03,alpha:1))
        text(c,"L U D D I T E",640,370,66,white,true)
        text(c,"통신 종료",640,303,22,cyan,true)
    }
    if elapsed>=14 && t<73 {staticNoise(c,t,t>=65 ? 0.2:t<10 ? 1:0.55)}
    fill(c,0,0,1280,45,.black);fill(c,0,675,1280,45,.black)
    if elapsed>=14 && t<65 {text(c,"2030  /  러다이트 외부 채널",64,645,22,red)}
    let fade=min(1,elapsed/0.6)*min(1,max(0,(79-elapsed)/0.6))
    if fade<1{fill(c,0,0,1280,720,NSColor(calibratedWhite:0,alpha:1-fade))}
}
let final=out.appendingPathComponent("luddite-v7-no-voice.mp4")
try? FileManager.default.removeItem(at:final)
let writer=try AVAssetWriter(outputURL:final,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:4_000_000,AVVideoMaxKeyFrameIntervalKey:48]])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
writer.add(input)
guard writer.startWriting() else {fatalError("writer start: \(String(describing:writer.error))")}
writer.startSession(atSourceTime:.zero)
let snapshots:[Int]=[104,116,128,144,350,420,480,540,600,792,1800]
for f in 0..<Int(duration*Double(fps)) {
    while !input.isReadyForMoreMediaData {
        if writer.status == .failed {fatalError("writer failed: \(String(describing:writer.error))")}
        Thread.sleep(forTimeInterval:0.002)
    }
    autoreleasepool {
        var b:CVPixelBuffer?
        guard let pool=adaptor.pixelBufferPool else {fatalError("No buffer pool")}
        CVPixelBufferPoolCreatePixelBuffer(nil,pool,&b)
        let buffer=b!
        CVPixelBufferLockBaseAddress(buffer,[])
        let c=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
        draw(c,Double(f)/Double(fps))
        if snapshots.contains(f),let im=c.makeImage() {
            let u=out.appendingPathComponent("frame-\(f).png")
            let d=CGImageDestinationCreateWithURL(u as CFURL,"public.png" as CFString,1,nil)!
            CGImageDestinationAddImage(d,im,nil);CGImageDestinationFinalize(d)
        }
        CVPixelBufferUnlockBaseAddress(buffer,[])
        guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else {fatalError("append failed")}
    }
    if f%240==0 {print("Rendered \(f)/1896");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0)
writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else {fatalError("render: \(String(describing:writer.error))")}
let result=AVURLAsset(url:final)
print("DONE duration=\(CMTimeGetSeconds(result.duration)) video=\(result.tracks(withMediaType:.video).count) audio=\(result.tracks(withMediaType:.audio).count) \(final.path)")
// Optional sound version: alert chimes only, no voice. Silent master is preserved.
let composition=AVMutableComposition()
let video=composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
try video.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:duration,preferredTimescale:600)),of:result.tracks(withMediaType:.video)[0],at:.zero)
let sound=AVURLAsset(url:assets.appendingPathComponent("alert-effects.wav"))
let audio=composition.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
try audio.insertTimeRange(CMTimeRange(start:.zero,duration:CMTime(seconds:duration,preferredTimescale:600)),of:sound.tracks(withMediaType:.audio)[0],at:.zero)
let soundURL=out.appendingPathComponent("luddite-v7-alerts.mp4")
try? FileManager.default.removeItem(at:soundURL)
let export=AVAssetExportSession(asset:composition,presetName:AVAssetExportPresetHighestQuality)!
export.outputURL=soundURL;export.outputFileType = .mp4;export.shouldOptimizeForNetworkUse=true
let doneAudio=DispatchSemaphore(value:0)
export.exportAsynchronously{doneAudio.signal()};doneAudio.wait()
guard export.status == .completed else {fatalError("sound export: \(String(describing:export.error))")}
print("DONE alert effects version \(soundURL.path)")
