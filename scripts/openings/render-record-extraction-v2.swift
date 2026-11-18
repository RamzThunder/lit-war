import Foundation
import AVFoundation
import CoreGraphics
import CoreImage
import ImageIO
import AppKit
import CoreText
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/record-extraction-test-v2")
let shared=root.appendingPathComponent("output/openings/conveyor-motion-test-v1/assets")
let assets=root.appendingPathComponent("output/openings/record-extraction-test-v1/assets")
let W=1280,H=720,fps:Int32=24,duration=10.0
func load(_ name:String)->CGImage{let directory=name == "blank-page.png" ? assets:shared;let s=CGImageSourceCreateWithURL(directory.appendingPathComponent(name) as CFURL,nil)!;return CGImageSourceCreateImageAtIndex(s,0,nil)!}
let plate=load("machine-clean-plate.png"),belt=load("belt-texture.png"),paper=load("manuscript-page.png")
let blank=load("blank-page.png")
let ci=CIContext(options:[.cacheIntermediates:false])
let extent=CGRect(x:0,y:0,width:W,height:H)
let base=CIImage(cgImage:plate).transformed(by:CGAffineTransform(scaleX:Double(W)/Double(plate.width),y:Double(H)/Double(plate.height)))
let kernel=CIWarpKernel(source:"""
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
let topLeft=CIVector(x:0,y:248),topRight=CIVector(x:642,y:275)
let bottomLeft=CIVector(x:0,y:124),bottomRight=CIVector(x:727,y:259)
func transport(_ t:Double)->Double {min(t,2)*270+max(0,t-7)*260}
func clamp(_ x:Double)->Double {min(1,max(0,x))}
func smooth(_ x:Double)->Double {let p=clamp(x);return p*p*(3-2*p)}
func beltLayer(_ t:Double)->CIImage {
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
let bitFont=CTFontCreateWithName("Menlo-Regular" as CFString,8.5,nil)
let digitLines:[CTLine]=["0","1"].map { value in
    CTLineCreateWithAttributedString(NSAttributedString(string:value,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):bitFont,.foregroundColor:NSColor(calibratedRed:0.28,green:0.92,blue:0.88,alpha:1)]))
}
func binaryStream(_ c:CGContext,_ t:Double) {
    c.saveGState();c.setBlendMode(.screen)
    for i in 0..<31 {
        let birth=2.3+Double(i)*0.055
        let age=t-birth,q=age/1.8
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
    // Incoming bits light rows on the real server; after receipt they stay lit.
    let received=clamp((t-4.1)/1.7)
    for i in 0..<22 {
        if Double(i)/22>received {continue}
        let x=1002+Double(i%3)*9,y=628+Double(i/3)*7
        let stable=t>=6.0
        let alpha=stable ? 0.55:0.20+0.32*pow(sin(t*5+Double(i)),2)
        c.setShadow(offset:.zero,blur:5,color:NSColor(calibratedRed:0.15,green:0.8,blue:0.78,alpha:alpha*0.6).cgColor)
        c.setFillColor(NSColor(calibratedRed:0.18,green:0.87,blue:0.84,alpha:alpha).cgColor)
        c.fill(CGRect(x:x,y:y,width:5+Double(i%3),height:1.1))
    }
    c.restoreGState()
}
func draw(_ c:CGContext,_ t:Double) {
    c.setFillColor(NSColor.black.cgColor);c.fill(extent)
    var zoom=1.24,centerX=620.0,centerY=300.0
    if t<2.2 {
        let p=smooth(t/2.2);zoom=1.24+0.5*p;centerX=620+40*p;centerY=300-15*p
    } else if t<4.0 {
        zoom=1.74;centerX=660;centerY=285
    } else if t<6.9 {
        let p=smooth((t-4)/1.0);zoom=1.74-0.12*p;centerX=660+220*p;centerY=285+205*p
    } else {
        // Cut back to the waiting sheet only AFTER storage has finished.
        zoom=1.72;centerX=750;centerY=288
    }
    c.saveGState();c.translateBy(x:640-centerX*zoom,y:360-centerY*zoom);c.scaleBy(x:zoom,y:zoom)
    c.interpolationQuality = .high
    let rollerTime=t<7 ? 0:max(0,t-7)*1.15
    let warped=kernel.apply(extent:extent,roiCallback:{_,rect in rect.insetBy(dx:0,dy:-80)},image:base,arguments:[rollerTime])!
    c.draw(ci.createCGImage(warped,from:extent)!,in:extent)
    let surface=beltLayer(t),bounds=surface.extent.integral
    if let texture=ci.createCGImage(surface,from:bounds){c.saveGState();c.setAlpha(0.90);c.draw(texture,in:bounds);c.restoreGState()}
    binaryStream(c,t)
    // Nothing is shredded until the last bit has arrived and the storage lights have settled.
    for i in 0..<42 {
        let age=t-(7.65+Double(i)*0.033)
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
let final=out.appendingPathComponent("record-extraction-test-v2.mp4")
try? FileManager.default.removeItem(at:final)
let writer=try AVAssetWriter(outputURL:final,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:6_000_000]])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H,kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true])
writer.add(input);guard writer.startWriting() else {fatalError(String(describing:writer.error))};writer.startSession(atSourceTime:.zero)
for f in 0..<Int(duration*Double(fps)) {
    while !input.isReadyForMoreMediaData {Thread.sleep(forTimeInterval:0.002)}
    autoreleasepool {
        var b:CVPixelBuffer?;CVPixelBufferPoolCreatePixelBuffer(nil,adaptor.pixelBufferPool!,&b)
        let buffer=b!;CVPixelBufferLockBaseAddress(buffer,[])
        let c=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
        draw(c,Double(f)/Double(fps))
        if [0,48,72,96,120,144,168,192,216].contains(f),let im=c.makeImage(){let u=out.appendingPathComponent("frame-\(f).png");let d=CGImageDestinationCreateWithURL(u as CFURL,"public.png" as CFString,1,nil)!;CGImageDestinationAddImage(d,im,nil);CGImageDestinationFinalize(d)}
        CVPixelBufferUnlockBaseAddress(buffer,[])
        guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else{fatalError("append failed")}
    }
    if f%48==0 {print("Rendered \(f)/240");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else{fatalError(String(describing:writer.error))}
let a=AVURLAsset(url:final);print("DONE duration=\(CMTimeGetSeconds(a.duration)) video=\(a.tracks(withMediaType:.video).count) audio=\(a.tracks(withMediaType:.audio).count) \(final.path)")
