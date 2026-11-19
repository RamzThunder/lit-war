// Offline sample-bank performance. Input rows are sample time, channel, key, velocity.
import AVFoundation
import AudioToolbox

let args = CommandLine.arguments
let engine = AVAudioEngine()
let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!
let bank = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")
var band = [AVAudioUnitSampler]()
for (index, program) in [80, 38, 81, 30, 0].enumerated() {
    let unit = AVAudioUnitSampler()
    engine.attach(unit)
    engine.connect(unit, to: engine.mainMixerNode, format: format)
    try unit.loadSoundBankInstrument(at: bank, program: UInt8(program),
        bankMSB: UInt8(index == 4 ? kAUSampler_DefaultPercussionBankMSB : kAUSampler_DefaultMelodicBankMSB),
        bankLSB: UInt8(kAUSampler_DefaultBankLSB))
    unit.masterGain = [-6,-5,-10,-10,-5][index]
    unit.pan = [0,0,-0.45,0.40,0][index]
    band.append(unit)
}
try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 4096)
try engine.start()
let file = try AVAudioFile(forWriting: URL(fileURLWithPath:args[2]), settings:format.settings)
let buffer = AVAudioPCMBuffer(pcmFormat:format, frameCapacity:4096)!
var position = 0
func advance(_ end: Int) throws {
    while position < end {
        let count = min(end-position,4096)
        guard try engine.renderOffline(AVAudioFrameCount(count), to: buffer) == .success else { fatalError("Audio render failed") }
        try file.write(from:buffer)
        position += count
    }
}
for row in try String(contentsOfFile:args[1],encoding:.utf8).split(separator:"\n") {
    let v = row.split(separator:" ").map { Int($0)! }
    try advance(v[0])
    if v[3] == 0 { band[v[1]].stopNote(UInt8(v[2]),onChannel:0) }
    else { band[v[1]].startNote(UInt8(v[2]),withVelocity:UInt8(v[3]),onChannel:0) }
}
try advance(79*44100)
engine.stop()
