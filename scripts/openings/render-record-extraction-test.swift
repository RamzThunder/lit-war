import Foundation
import AVFoundation
import CoreGraphics
import CoreImage
import ImageIO
import AppKit
import CoreText
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/record-extraction-test-v1")
let shared=root.appendingPathComponent("output/openings/conveyor-motion-test-v1/assets")
let assets=out.appendingPathComponent("assets")
let W=1280,H=720,fps:Int32=24,duration=8.0
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
func beltLayer(_ t:Double)->CIImage {
    let c=CGContext(data:nil,width:1024,height:512,bitsPerComponent:8,bytesPerRow:1024*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
    c.interpolationQuality = .high
    let shift=(t*128).truncatingRemainder(dividingBy:1024)
    for i in -1...1 {c.draw(belt,in:CGRect(x:Double(i)*1024+shift,y:0,width:1024,height:512))}
    // A single sheet: scanned regions become blank, then its leading edge folds into the intake.
    let x=230+t*155,y=270.0,w=250.0,h=250.0
    if x-w/2<1030 {
        let pageContext=CGContext(data:nil,width:512,height:512,bitsPerComponent:8,bytesPerRow:512*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        pageContext.interpolationQuality = .high
        pageContext.draw(paper,in:CGRect(x:0,y:0,width:512,height:512))
        let wipe=max(0,min(512,(900-(x-w/2))/w*512))
        pageContext.saveGState();pageContext.clip(to:CGRect(x:wipe,y:0,width:512-wipe,height:512))
        pageContext.draw(blank,in:CGRect(x:0,y:0,width:512,height:512));pageContext.restoreGState()
        let page=CIImage(cgImage:pageContext.makeImage()!)
        let bite=min(0.90,max(0,(x+w/2-968)/170))
        let hh=h/2*(1-bite*0.72)
        let folded=page.applyingFilter("CIPerspectiveTransform",parameters:[
            "inputTopLeft":CIVector(x:x-w/2,y:y+h/2),"inputBottomLeft":CIVector(x:x-w/2,y:y-h/2),
            "inputTopRight":CIVector(x:x+w/2,y:y+hh),"inputBottomRight":CIVector(x:x+w/2,y:y-hh)])
        let bounds=folded.extent.integral
        if let im=ci.createCGImage(folded,from:bounds){c.draw(im,in:bounds)}
        if x+w/2>900 && x-w/2<900 {
            c.saveGState();c.setBlendMode(.screen)
            c.setFillColor(NSColor(calibratedRed:1,green:0.12,blue:0.08,alpha:0.9).cgColor)
            c.fill(CGRect(x:898,y:y-h/2,width:4,height:h))
            c.setFillColor(NSColor(calibratedRed:1,green:0.12,blue:0.08,alpha:0.14).cgColor)
            c.fill(CGRect(x:890,y:y-h/2,width:20,height:h));c.restoreGState()
        }
    }
    let image=CIImage(cgImage:c.makeImage()!)
    return image.applyingFilter("CIPerspectiveTransform",parameters:["inputTopLeft":topLeft,"inputTopRight":topRight,"inputBottomLeft":bottomLeft,"inputBottomRight":bottomRight])
}
func dataGlyph(_ c:CGContext,_ text:String,_ x:Double,_ y:Double,_ alpha:Double) {
    let font=CTFontCreateWithName("AppleMyungjo" as CFString,17,nil)
    let color=NSColor(calibratedRed:0.35,green:0.95,blue:0.9,alpha:alpha)
    let line=CTLineCreateWithAttributedString(NSAttributedString(string:text,attributes:[NSAttributedString.Key(kCTFontAttributeName as String):font,.foregroundColor:color]))
    c.textMatrix = .identity;c.textPosition=CGPoint(x:x,y:y)
    c.setShadow(offset:.zero,blur:7,color:color.withAlphaComponent(alpha*0.6).cgColor)
    CTLineDraw(line,c);c.setShadow(offset:.zero,blur:0,color:nil)
}
func draw(_ c:CGContext,_ t:Double) {
    c.setFillColor(NSColor.black.cgColor);c.fill(extent)
    let p=min(1,t/6),ease=p*p*(3-2*p),zoom=1.14+ease*0.30
    c.saveGState();c.translateBy(x:640-(620+ease*80)*zoom,y:360-(305+ease*22)*zoom);c.scaleBy(x:zoom,y:zoom)
    c.interpolationQuality = .high
    let warped=kernel.apply(extent:extent,roiCallback:{_,rect in rect.insetBy(dx:0,dy:-80)},image:base,arguments:[t*1.15])!
    c.draw(ci.createCGImage(warped,from:extent)!,in:extent)
    let surface=beltLayer(t),bounds=surface.extent.integral
    if let texture=ci.createCGImage(surface,from:bounds){c.saveGState();c.setAlpha(0.88);c.draw(texture,in:bounds);c.restoreGState()}
    // Information rises only as the original sheet crosses the scanner.
    let words=["기억","기록","이야기","문학","사람","기록","이야기","문학"]
    for i in 0..<8 {
        let age=t-(3.55+Double(i)*0.19)
        if age<0 || age>2.8 {continue}
        let q=age/2.8,opacity=min(1,age*4)*(1-q)*0.9
        let x=679+215*q+sin(q*4+Double(i)*0.7)*22
        let y=279+285*q
        c.saveGState();c.setBlendMode(.screen)
        c.setStrokeColor(NSColor(calibratedRed:0.15,green:0.8,blue:0.8,alpha:opacity*0.15).cgColor)
        c.setLineWidth(0.6);c.move(to:CGPoint(x:x-8,y:y-28));c.addLine(to:CGPoint(x:x+10,y:y-4));c.strokePath()
        dataGlyph(c,words[i],x,y,opacity);c.restoreGState()
    }
    // Paper waste follows the sheet being gripped, never before.
    for i in 0..<36 {
        let age=t-(4.45+Double(i)*0.046)
        if age<0 || age>2.5 {continue}
        let x=742+Double((i*37)%145)+sin(age*2.6+Double(i))*17
        let y=255-age*78-age*age*20
        let crop=CGRect(x:Double(blank.width)*(0.44+Double(i%6)*0.018),y:Double(blank.height)*0.40,width:Double(blank.width)*0.012,height:Double(blank.height)*0.20)
        if let scrap=blank.cropping(to:crop) {
            c.saveGState();c.setAlpha(min(0.66,age*5)*(1-age/2.5));c.translateBy(x:x,y:y);c.rotate(by:sin(age*4+Double(i))*0.6)
            c.draw(scrap,in:CGRect(x:0,y:0,width:3,height:16+Double(i%10)));c.restoreGState()
        }
    }
    c.restoreGState()
    c.setFillColor(NSColor.black.cgColor);c.fill(CGRect(x:0,y:0,width:1280,height:30));c.fill(CGRect(x:0,y:690,width:1280,height:30))
}
let final=out.appendingPathComponent("record-extraction-test-v1.mp4")
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
        if [0,48,84,108,132,156,180].contains(f),let im=c.makeImage(){let u=out.appendingPathComponent("frame-\(f).png");let d=CGImageDestinationCreateWithURL(u as CFURL,"public.png" as CFString,1,nil)!;CGImageDestinationAddImage(d,im,nil);CGImageDestinationFinalize(d)}
        CVPixelBufferUnlockBaseAddress(buffer,[])
        guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else{fatalError("append failed")}
    }
    if f%48==0 {print("Rendered \(f)/192");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else{fatalError(String(describing:writer.error))}
let a=AVURLAsset(url:final);print("DONE duration=\(CMTimeGetSeconds(a.duration)) video=\(a.tracks(withMediaType:.video).count) audio=\(a.tracks(withMediaType:.audio).count) \(final.path)")
