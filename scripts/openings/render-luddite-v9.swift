import Foundation
import AVFoundation
import AppKit
import CoreText
import ImageIO
import CoreImage

enum ExtractionScene {
static let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
static let out=root.appendingPathComponent("output/openings/luddite-v9")
static let shared=root.appendingPathComponent("output/openings/conveyor-motion-test-v1/assets")
static let assets=root.appendingPathComponent("output/openings/record-extraction-test-v1/assets")
static let W=1280,H=720,fps:Int32=24,duration=11.0
static func load(_ name:String)->CGImage{let directory=name == "server-dark-plate.png" ? out.appendingPathComponent("assets"):(name == "blank-page.png" ? assets:shared);let s=CGImageSourceCreateWithURL(directory.appendingPathComponent(name) as CFURL,nil)!;return CGImageSourceCreateImageAtIndex(s,0,nil)!}
static let plate=load("machine-clean-plate.png"),belt=load("belt-texture.png"),paper=load("manuscript-page.png")
static let blank=load("blank-page.png"),darkPlate=load("server-dark-plate.png")
static let ci=CIContext(options:[.cacheIntermediates:false])
static let extent=CGRect(x:0,y:0,width:W,height:H)
static let base=CIImage(cgImage:plate).transformed(by:CGAffineTransform(scaleX:Double(W)/Double(plate.width),y:Double(H)/Double(plate.height)))
static let baseDark=CIImage(cgImage:darkPlate).transformed(by:CGAffineTransform(scaleX:Double(W)/Double(darkPlate.width),y:Double(H)/Double(darkPlate.height)))
static let kernel=CIWarpKernel(source:"""
kernel vec2 rollerMotion(float time) {
    vec2 d=destCoord();
    if(d.x < 648.0 || d.x > 1010.0) return d;
    float edge=smoothstep(648.0,666.0,d.x)*(1.0-smoothstep(992.0,1010.0,d.x));
    float center=334.0+0.05*(d.x-650.0);
    float radius=25.0;
    float v=(d.y-center)/radius;
    float direction=1.0;
    if(abs(v)>0.92) {
        center=274.0-0.015*(d.x-650.0); radius=28.0;
        v=(d.y-center)/radius; direction=-1.0;
    }
    if(abs(v)>0.92) return d;
    float blend=(1.0-smoothstep(0.56,0.92,abs(v)))*edge*0.78;
    float shift=sin(time*direction*2.0+v*1.4)*1.7;
    return vec2(d.x,d.y+shift*blend);
}
""")!
static let topLeft=CIVector(x:0,y:248),topRight=CIVector(x:642,y:275)
static let bottomLeft=CIVector(x:0,y:124),bottomRight=CIVector(x:727,y:259)
static func transport(_ t:Double)->Double {min(t,2)*270+max(0,t-7.8)*260}
static func clamp(_ x:Double)->Double {min(1,max(0,x))}
static func smooth(_ x:Double)->Double {let p=clamp(x);return p*p*(3-2*p)}
static func beltLayer(_ t:Double)->CIImage {
    let c=CGContext(data:nil,width:1024,height:512,bitsPerComponent:8,bytesPerRow:1024*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
    c.interpolationQuality = .high
    let shift=transport(t).truncatingRemainder(dividingBy:1024)
    for i in -1...1 {c.draw(belt,in:CGRect(x:Double(i)*1024+shift,y:0,width:1024,height:512))}
    // A single sheet: scanned regions become blank, then its leading edge folds into the intake.
    let x=230+transport(t),y=270.0,w=280.0,h=380.0
    if x-w/2<1030 {
        let pageContext=CGContext(data:nil,width:512,height:512,bitsPerComponent:8,bytesPerRow:512*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        pageContext.interpolationQuality = .high
        pageContext.draw(paper,in:CGRect(x:0,y:0,width:512,height:512))
        let scan=clamp((t-2.2)/1.8)
        let wipe=scan*512
        pageContext.saveGState();pageContext.clip(to:CGRect(x:0,y:0,width:wipe,height:512))
        pageContext.draw(blank,in:CGRect(x:0,y:0,width:512,height:512));pageContext.restoreGState()
        let page=CIImage(cgImage:pageContext.makeImage()!)
        let bite=min(0.90,max(0,(x+w/2-968)/170))
        let hh=h/2*(1-bite*0.72)
        let folded=page.applyingFilter("CIPerspectiveTransform",parameters:[
            "inputTopLeft":CIVector(x:x-w/2,y:y+h/2),"inputBottomLeft":CIVector(x:x-w/2,y:y-h/2),
            "inputTopRight":CIVector(x:x+w/2,y:y+hh),"inputBottomRight":CIVector(x:x+w/2,y:y-hh)])
        let bounds=folded.extent.integral
        if let im=ci.createCGImage(folded,from:bounds){c.draw(im,in:bounds)}
        if t>=2.2 && t<4.0 {
            let scanner=x-w/2+scan*w
            c.saveGState();c.setBlendMode(.screen)
            c.setFillColor(NSColor(calibratedRed:1,green:0.12,blue:0.08,alpha:0.9).cgColor)
            c.fill(CGRect(x:scanner-2,y:y-h/2,width:4,height:h))
            c.setFillColor(NSColor(calibratedRed:1,green:0.12,blue:0.08,alpha:0.14).cgColor)
            c.fill(CGRect(x:scanner-10,y:y-h/2,width:20,height:h));c.restoreGState()
        }
    }
    let image=CIImage(cgImage:c.makeImage()!)
    return image.applyingFilter("CIPerspectiveTransform",parameters:["inputTopLeft":topLeft,"inputTopRight":topRight,"inputBottomLeft":bottomLeft,"inputBottomRight":bottomRight])
}
static let bitFont=CTFontCreateWithName("Menlo-Regular" as CFString,8.5,nil)
static let digitLines:[CTLine]=["0","1"].map { value in
    CTLineCreateWithAttributedString(NSAttributedString(string:value,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):bitFont,.foregroundColor:NSColor(calibratedRed:0.28,green:0.92,blue:0.88,alpha:1)]))
}
static func binaryStream(_ c:CGContext,_ t:Double) {
    c.saveGState();c.setBlendMode(.screen)
    for i in 0..<31 {
        let birth=2.3+Double(i)*0.055
        let age=t-birth,q=age/2.4
        if q<0 || q>1 {continue}
        let inv=1-q
        let x=inv*inv*inv*652+3*inv*inv*q*724+3*inv*q*q*940+q*q*q*1015
        let y=inv*inv*inv*276+3*inv*inv*q*371+3*inv*q*q*535+q*q*q*652
        for lane in 0..<5 {
            let alpha=min(1,age*9)*min(1,(1-q)*12)*(lane==2 ? 0.95:0.64)
            let dx=Double(lane-2)*6+sin(q*5+Double(lane))*2
            c.saveGState();c.setAlpha(alpha)
            c.setShadow(offset:.zero,blur:3,color:NSColor(calibratedRed:0.1,green:0.85,blue:0.8,alpha:0.5).cgColor)
            c.textMatrix = .identity;c.textPosition=CGPoint(x:x+dx,y:y+Double(lane%2)*3)
            CTLineDraw(digitLines[(i*13+lane*7)%2],c);c.restoreGState()
        }
    }
    c.restoreGState()
}
static func draw(_ c:CGContext,_ t:Double) {
    c.setFillColor(NSColor.black.cgColor);c.fill(extent)
    var zoom=1.24,centerX=620.0,centerY=300.0
    if t<2.2 {
        let p=smooth(t/2.2);zoom=1.24+0.5*p;centerX=620+40*p;centerY=300-15*p
    } else if t<3.7 {
        zoom=1.74;centerX=660;centerY=285
    } else if t<7.5 {
        let p=smooth((t-3.7)/0.7);zoom=1.74+0.41*p;centerX=660+240*p;centerY=285+250*p
    } else {
        // Cut back to the waiting sheet only AFTER storage has finished.
        zoom=1.72;centerX=750;centerY=288
    }
    c.saveGState();c.translateBy(x:640-centerX*zoom,y:360-centerY*zoom);c.scaleBy(x:zoom,y:zoom)
    c.interpolationQuality = .high
    let rollerTime=t<7.8 ? 0:max(0,t-7.8)*1.15
    let warped=kernel.apply(extent:extent,roiCallback:{_,rect in rect.insetBy(dx:0,dy:-80)},image:baseDark,arguments:[rollerTime])!
    c.draw(ci.createCGImage(warped,from:extent)!,in:extent)
    // Illuminate actual artwork, not floating bars. The upper rack cluster begins unlit.
    let stored=clamp((t-4.7)/1.7)
    for row in 0..<13 {
        let lit=smooth((stored-Double(row)/13)*13)
        if lit<=0 {continue}
        c.saveGState();c.setAlpha(lit)
        c.clip(to:CGRect(x:640,y:475+Double(row)*20,width:640,height:21))
        c.draw(plate,in:extent);c.restoreGState()
    }
    let surface=beltLayer(t),bounds=surface.extent.integral
    if let texture=ci.createCGImage(surface,from:bounds){c.saveGState();c.setAlpha(0.90);c.draw(texture,in:bounds);c.restoreGState()}
    binaryStream(c,t)
    // Nothing is shredded until the last bit has arrived and the storage lights have settled.
    for i in 0..<42 {
        let age=t-(8.45+Double(i)*0.033)
        if age<0 || age>2.0 {continue}
        let x=742+Double((i*37)%145)+sin(age*2.6+Double(i))*17
        let y=255-age*78-age*age*20
        let crop=CGRect(x:Double(blank.width)*(0.44+Double(i%6)*0.018),y:Double(blank.height)*0.40,width:Double(blank.width)*0.012,height:Double(blank.height)*0.20)
        if let scrap=blank.cropping(to:crop) {
            c.saveGState();c.setAlpha(min(0.6,age*6)*(1-age/2.0));c.translateBy(x:x,y:y);c.rotate(by:sin(age*4+Double(i))*0.6)
            c.draw(scrap,in:CGRect(x:0,y:0,width:2.5,height:13+Double(i%8)));c.restoreGState()
        }
    }
    c.restoreGState()
    c.setFillColor(NSColor.black.cgColor);c.fill(CGRect(x:0,y:0,width:1280,height:30));c.fill(CGRect(x:0,y:690,width:1280,height:30))
}

}
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/luddite-v9")
let assets=root.appendingPathComponent("output/openings/luddite-v8/assets")
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
let machineArtwork=loadImage("human-consumes-records.png"),paperArtwork=loadImage("manuscript-page.png")
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
func machineScene(_ c:CGContext,_ u:Double) {ExtractionScene.draw(c,u)}
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
        let subtitleColors=[NSColor(calibratedWhite:0,alpha:0.78).cgColor,NSColor(calibratedWhite:0,alpha:0).cgColor] as CFArray
        if let g=CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:subtitleColors,locations:[0,1]) {
            c.drawLinearGradient(g,start:CGPoint(x:0,y:45),end:CGPoint(x:0,y:245),options:[])
        }
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
if CommandLine.arguments.contains("--stills") {
    for second in [17.7,18.4,19.4,20.4,21.2,22.2,23.4,24.6] {
        let c=CGContext(data:nil,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        draw(c,second)
        let u=out.appendingPathComponent(String(format:"preview-%.1f.png",second))
        let d=CGImageDestinationCreateWithURL(u as CFURL,"public.png" as CFString,1,nil)!
        CGImageDestinationAddImage(d,c.makeImage()!,nil);CGImageDestinationFinalize(d)
    }
    print("Preview frames ready");exit(0)
}
let final=out.appendingPathComponent("luddite-v9-no-voice.mp4")
try? FileManager.default.removeItem(at:final)
let writer=try AVAssetWriter(outputURL:final,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:4_000_000,AVVideoMaxKeyFrameIntervalKey:48]])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
writer.add(input)
guard writer.startWriting() else {fatalError("writer start: \(String(describing:writer.error))")}
writer.startSession(atSourceTime:.zero)
let snapshots:[Int]=[128,192,420,444,468,492,516,552,588,792,1800]
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
        if CommandLine.arguments.contains("--qa") && snapshots.contains(f),let im=c.makeImage() {
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
let soundURL=out.appendingPathComponent("luddite-v9-alerts.mp4")
try? FileManager.default.removeItem(at:soundURL)
let export=AVAssetExportSession(asset:composition,presetName:AVAssetExportPresetHighestQuality)!
export.outputURL=soundURL;export.outputFileType = .mp4;export.shouldOptimizeForNetworkUse=true
let doneAudio=DispatchSemaphore(value:0)
export.exportAsynchronously{doneAudio.signal()};doneAudio.wait()
guard export.status == .completed else {fatalError("sound export: \(String(describing:export.error))")}
print("DONE alert effects version \(soundURL.path)")
