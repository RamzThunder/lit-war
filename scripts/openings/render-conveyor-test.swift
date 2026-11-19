import Foundation
import AVFoundation
import CoreGraphics
import CoreImage
import ImageIO
import AppKit
let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("output/openings/conveyor-motion-test-v1")
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
let assets=root.appendingPathComponent("assets/openings/conveyor-motion-test-v1")
let W=1280,H=720,fps:Int32=24,duration=8.0
func load(_ name:String)->CGImage{let s=CGImageSourceCreateWithURL(assets.appendingPathComponent(name) as CFURL,nil)!;return CGImageSourceCreateImageAtIndex(s,0,nil)!}
let plate=load("machine-clean-plate.png"),belt=load("belt-texture.png"),paper=load("manuscript-page.png")
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
    // Documents travel at exactly the same UV speed as the belt texture.
    for i in -4...4 {
        let x=Double(i)*295+t*128
        if x < -180 || x>1200 {continue}
        c.saveGState();c.translateBy(x:x,y:250+Double((i+8)%3-1)*30)
        c.rotate(by:sin(Double(i)*3.1)*0.07)
        c.draw(paper,in:CGRect(x:-82,y:-61,width:164,height:122))
        c.restoreGState()
    }
    let image=CIImage(cgImage:c.makeImage()!)
    return image.applyingFilter("CIPerspectiveTransform",parameters:["inputTopLeft":topLeft,"inputTopRight":topRight,"inputBottomLeft":bottomLeft,"inputBottomRight":bottomRight])
}
func draw(_ c:CGContext,_ t:Double) {
    c.interpolationQuality = .high
    let warped=kernel.apply(extent:extent,roiCallback:{_,rect in rect.insetBy(dx:0,dy:-80)},image:base,arguments:[t*1.15])!
    let background=ci.createCGImage(warped,from:extent)!
    c.draw(background,in:extent)
    let surface=beltLayer(t)
    let bounds=surface.extent.integral
    if let texture=ci.createCGImage(surface,from:bounds) {
        c.saveGState();c.setAlpha(0.83);c.draw(texture,in:bounds);c.restoreGState()
    }
    // The fixed surrounding chassis is always untouched; only its roller interiors are warped.
    for i in 0..<20 {
        let p=(t*0.36+Double(i)*0.173).truncatingRemainder(dividingBy:1)
        let x=725+Double((i*37)%215)+sin(p*5+Double(i))*12
        let y=245-p*168
        let crop=CGRect(x:Double(paper.width)*(0.44+Double(i%6)*0.018),y:Double(paper.height)*0.40,width:Double(paper.width)*0.012,height:Double(paper.height)*0.20)
        if let scrap=paper.cropping(to:crop) {
            c.saveGState();c.setAlpha(min(0.58,p*5)*(1-p))
            c.translateBy(x:x,y:y);c.rotate(by:sin(p*7+Double(i))*0.5)
            c.draw(scrap,in:CGRect(x:0,y:0,width:3,height:18+Double(i%11)))
            c.restoreGState()
        }
    }
    // Black cinematic frame, no captions or camera movement in this mechanical test.
    c.setFillColor(NSColor.black.cgColor);c.fill(CGRect(x:0,y:0,width:1280,height:30));c.fill(CGRect(x:0,y:690,width:1280,height:30))
}
let final=out.appendingPathComponent("conveyor-motion-test-v1.mp4")
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
        if [0,24,48,96,144].contains(f),let im=c.makeImage(){let u=out.appendingPathComponent("frame-\(f).png");let d=CGImageDestinationCreateWithURL(u as CFURL,"public.png" as CFString,1,nil)!;CGImageDestinationAddImage(d,im,nil);CGImageDestinationFinalize(d)}
        CVPixelBufferUnlockBaseAddress(buffer,[])
        guard adaptor.append(buffer,withPresentationTime:CMTime(value:Int64(f),timescale:fps)) else{fatalError("append failed")}
    }
    if f%48==0 {print("Rendered \(f)/192");fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
guard writer.status == .completed else{fatalError(String(describing:writer.error))}
let a=AVURLAsset(url:final);print("DONE duration=\(CMTimeGetSeconds(a.duration)) video=\(a.tracks(withMediaType:.video).count) audio=\(a.tracks(withMediaType:.audio).count) \(final.path)")
