import SwiftUI
@preconcurrency import AVFoundation
import PhotosUI
import Supabase
import Storage
import Functions

// MARK: - Toast View
struct ToastView: View {
    let message: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .font(.system(size: 20))

            Text(message)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.black.opacity(0.9))
        )
        .padding(.horizontal, 16)
        .padding(.top, 50) // Account for safe area
    }
}

struct ScannerView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = ScannerViewModel()
    @State private var showingImagePicker = false
    @State private var selectedItem: PhotosPickerItem?
    @State private var capturedImage: UIImage?
    @State private var showingResult = false
    @State private var flashOn = false

    var body: some View {
        ZStack {
            // Camera View - Full Screen
            CameraView(viewModel: viewModel)
                .ignoresSafeArea()

            // Gradient overlays for better UI visibility
            VStack {
                LinearGradient(
                    colors: [Color.black.opacity(0.7), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 200)
                .ignoresSafeArea()

                Spacer()

                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.7)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 250)
                .ignoresSafeArea()
            }

            // UI Controls
            VStack {
                // Top Bar
                HStack {
                    // Close Button
                    Button {
                        hapticManager.lightImpact()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(
                                Circle()
                                    .fill(Color.white.opacity(0.2))
                            )
                    }

                    Spacer()

                    // Flash Button
                    Button {
                        hapticManager.lightImpact()
                        flashOn.toggle()
                        viewModel.toggleFlash(flashOn)
                    } label: {
                        Image(systemName: flashOn ? "bolt.fill" : "bolt.slash.fill")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(flashOn ? .yellow : .white)
                            .frame(width: 40, height: 40)
                            .background(
                                Circle()
                                    .fill(Color.white.opacity(0.2))
                            )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 60)

                Spacer()

                // Center Frame Guide
                VStack(spacing: 20) {
                    // Frame
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.5), lineWidth: 2)
                        .frame(width: 280, height: 380)
                        .overlay(
                            // Corner markers
                            ZStack {
                                // Top left
                                Path { path in
                                    path.move(to: CGPoint(x: 0, y: 30))
                                    path.addLine(to: CGPoint(x: 0, y: 0))
                                    path.addLine(to: CGPoint(x: 30, y: 0))
                                }
                                .stroke(Color.white, lineWidth: 3)

                                // Top right
                                Path { path in
                                    path.move(to: CGPoint(x: 250, y: 0))
                                    path.addLine(to: CGPoint(x: 280, y: 0))
                                    path.addLine(to: CGPoint(x: 280, y: 30))
                                }
                                .stroke(Color.white, lineWidth: 3)

                                // Bottom left
                                Path { path in
                                    path.move(to: CGPoint(x: 0, y: 350))
                                    path.addLine(to: CGPoint(x: 0, y: 380))
                                    path.addLine(to: CGPoint(x: 30, y: 380))
                                }
                                .stroke(Color.white, lineWidth: 3)

                                // Bottom right
                                Path { path in
                                    path.move(to: CGPoint(x: 250, y: 380))
                                    path.addLine(to: CGPoint(x: 280, y: 380))
                                    path.addLine(to: CGPoint(x: 280, y: 350))
                                }
                                .stroke(Color.white, lineWidth: 3)
                            }
                        )

                    // Instructions
                    Text("Position wine label in frame")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                }

                Spacer()

                // Bottom Controls
                VStack(spacing: 20) {
                    // Capture Controls
                    HStack(alignment: .center, spacing: 40) {
                        // Library Button
                        Button {
                            hapticManager.lightImpact()
                            showingImagePicker = true
                        } label: {
                            VStack(spacing: 4) {
                                Image(systemName: "photo.on.rectangle")
                                    .font(.system(size: 24))
                                    .foregroundColor(.white)
                            }
                            .frame(width: 50, height: 50)
                        }

                        // Capture Button
                        Button {
                            hapticManager.heavyImpact()
                            capturePhoto()
                        } label: {
                            ZStack {
                                Circle()
                                    .stroke(Color.white, lineWidth: 3)
                                    .frame(width: 75, height: 75)

                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 65, height: 65)
                            }
                        }
                        .scaleEffect(viewModel.isCapturing ? 0.9 : 1.0)
                        .animation(.spring(response: 0.1, dampingFraction: 0.6), value: viewModel.isCapturing)

                        // Spacer for balance
                        Color.clear
                            .frame(width: 50, height: 50)
                    }
                }
                .padding(.bottom, 50)
            }
        }
        .onAppear {
            viewModel.startSession()
        }
        .onDisappear {
            viewModel.stopSession()
        }
        .photosPicker(
            isPresented: $showingImagePicker,
            selection: $selectedItem,
            matching: .images
        )
        .onChange(of: selectedItem) { _, newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    capturedImage = image
                    showingResult = true
                }
            }
        }
        .sheet(isPresented: $showingResult) {
            if let image = capturedImage {
                ScanResultView(image: image)
                    .environmentObject(hapticManager)
            }
        }
    }

    func capturePhoto() {
        viewModel.capturePhoto { image in
            capturedImage = image
            showingResult = true
        }
    }
}

// MARK: - Camera View
struct CameraView: UIViewRepresentable {
    @ObservedObject var viewModel: ScannerViewModel

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: UIScreen.main.bounds)
        view.backgroundColor = .black
        viewModel.setupCamera(in: view)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}

// Helper struct for encoding pending tasting notes
struct PendingTastingNotes: Encodable {
    let rating: Int
    let notes: String
    let detailed_notes: String?
    let location_name: String?
    let location_city: String?
    let location_address: String?
    let location_latitude: Double?
    let location_longitude: Double?
}

// MARK: - Scan Result View
struct ScanResultView: View {
    let image: UIImage
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    // Processing state
    @State private var isProcessingImage = true
    @State private var winesAddedId: String?
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingTastingEditor = false
    @State private var pendingVintageId: UUID?
    @State private var pendingTasting: Tasting?
    @State private var isLoadingEditor = false


    var body: some View {
        ZStack {
            Color.vinoDark.ignoresSafeArea()

            VStack(spacing: 20) {
                // Wine image at the top
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxHeight: 250)
                    .cornerRadius(16)
                    .padding(.horizontal)
                    .padding(.top, 40)

                // Processing status
                HStack(spacing: 12) {
                    if isProcessingImage {
                        ProgressView()
                            .scaleEffect(0.8)
                            .tint(.vinoAccent)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.green)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(isProcessingImage ? "Processing wine label..." : "Wine ready for tasting notes!")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.vinoText)
                        Text("Our AI sommelier is identifying this wine")
                            .font(.system(size: 13))
                            .foregroundColor(.vinoTextSecondary)
                    }
                    Spacer()
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.green.opacity(0.1))
                )
                .padding(.horizontal)

                Spacer()

                // Add Notes button
                Button {
                    hapticManager.lightImpact()
                    Task {
                        isLoadingEditor = true
                        // Make sure we have the vintage ID before showing the editor
                        if pendingVintageId == nil {
                            await getVintageId()
                        }
                        isLoadingEditor = false
                        showingTastingEditor = true
                    }
                } label: {
                    HStack {
                        if isLoadingEditor {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(.white)
                        } else {
                            Image(systemName: "note.text.badge.plus")
                                .font(.system(size: 20))
                        }
                        Text(isLoadingEditor ? "Loading..." : "Add Tasting Notes")
                            .font(.system(size: 17, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(isLoadingEditor ? Color.vinoAccent.opacity(0.7) : Color.vinoAccent)
                    )
                }
                .padding(.horizontal)
                .disabled(isLoadingEditor)

                // Skip button
                Button {
                    hapticManager.lightImpact()
                    dismiss()
                } label: {
                    Text("Skip for Now")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.vinoTextSecondary)
                }
                .padding(.bottom, 40)
            }
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showingTastingEditor) {
            // Use the proper TastingNoteEditorView with the existing tasting
            if let vintageId = pendingVintageId {
                TastingNoteEditorView(vintageId: vintageId, existingTasting: pendingTasting)
                    .environmentObject(hapticManager)
                    .environmentObject(authManager)
                    .interactiveDismissDisabled()
                    .onDisappear {
                        // Dismiss the entire scan flow when done
                        dismiss()
                    }
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
        .task {
            await uploadAndProcessWineImage()
        }
    }


    private func checkProcessingStatus() async {
        // Poll for the vintage_id once processing completes
        guard let winesAddedId = winesAddedId else { return }

        for _ in 0..<30 { // Poll for up to 30 seconds
            do {
                struct QueueStatus: Decodable {
                    let status: String
                    let processed_data: ProcessedWineData?

                    struct ProcessedWineData: Decodable {
                        let producer: String?
                        let wine_name: String?
                        let year: Int?
                        let confidence: Double?
                    }
                }

                let queueItem: QueueStatus = try await SupabaseManager.shared.client
                    .from("wines_added_queue")
                    .select("status, processed_data")
                    .eq("id", value: winesAddedId)
                    .single()
                    .execute()
                    .value

                if queueItem.status == "completed" {
                    // Successfully processed - we can now get the vintage_id
                    print("Wine processing completed")
                    isProcessingImage = false

                    // The vintage_id would be available after the edge function creates it
                    // For now we'll use a placeholder approach
                    await getVintageId()
                    return
                }
            } catch {
                print("Error checking status: \(error)")
            }

            try? await Task.sleep(for: .seconds(1))
        }

        // If we get here, processing took too long
        isProcessingImage = false
    }

    private func getVintageId() async {
        // Get the most recent tasting for this user to find the vintage_id and tasting
        do {
            let session = try await SupabaseManager.shared.client.auth.session
            let userId = session.user.id.uuidString.lowercased()

            let tasting: Tasting = try await SupabaseManager.shared.client
                .from("tastings")
                .select("*")
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .limit(1)
                .single()
                .execute()
                .value

            pendingVintageId = tasting.vintageId
            pendingTasting = tasting
        } catch {
            // Error handled silently
        }
    }

    private func uploadAndProcessWineImage() async {
        // Compress image with lower quality for faster upload
        guard let imageData = image.jpegData(compressionQuality: 0.5) else {
            errorMessage = "Failed to process image"
            isProcessingImage = false
            showingError = true
            return
        }

        do {
            // Get current user
            let session = try await SupabaseManager.shared.client.auth.session
            let user = session.user
            let userIdString = user.id.uuidString.lowercased()
            let fileName = "\(userIdString)/\(Date().timeIntervalSince1970).jpg"

            // Create IDs upfront
            let scanId = UUID()
            let queueId = UUID()
            let publicUrl = try SupabaseManager.shared.client.storage
                .from("scans")
                .getPublicURL(path: fileName)

            // Store the wines_added_queue ID immediately for tasting notes
            self.winesAddedId = queueId.uuidString

            // First, upload the image to storage
            try await SupabaseManager.shared.client.storage
                .from("scans")
                .upload(
                    fileName,
                    data: imageData,
                    options: .init(contentType: "image/jpeg")
                )

            // Second, insert into scans table
            try await SupabaseManager.shared.client
                .from("scans")
                .insert([
                    "id": scanId.uuidString,
                    "user_id": userIdString,
                    "image_path": fileName,
                    "scan_image_url": publicUrl.absoluteString
                ])
                .execute()

            // Finally, insert into wines_added_queue table (after scan_id exists)
            try await SupabaseManager.shared.client
                .from("wines_added_queue")
                .insert([
                    "id": queueId.uuidString,
                    "user_id": userIdString,
                    "image_url": publicUrl.absoluteString,
                    "scan_id": scanId.uuidString,
                    "status": "pending"
                ])
                .execute()

            // Trigger edge function in background (don't wait)
            Task {
                struct EmptyBody: Encodable {}
                _ = try? await SupabaseManager.shared.client.functions
                    .invoke("process-wine-queue", options: FunctionInvokeOptions(body: EmptyBody()))
            }

            // Start checking for processing completion
            await MainActor.run {
                Task {
                    await checkProcessingStatus()
                }
                hapticManager.success()
            }

        } catch {
            await MainActor.run {
                errorMessage = "Failed to upload wine: \(error.localizedDescription)"
                isProcessingImage = false
                showingError = true
                hapticManager.error()
            }
        }
    }

}

// MARK: - View Model
@MainActor
class ScannerViewModel: NSObject, ObservableObject {
    @Published var isCapturing = false
    private var captureSession: AVCaptureSession?
    private var photoOutput: AVCapturePhotoOutput?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var captureCompletion: ((UIImage) -> Void)?

    func setupCamera(in view: UIView) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let session = AVCaptureSession()
            session.sessionPreset = .photo

            guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                  let input = try? AVCaptureDeviceInput(device: device) else { return }

            if session.canAddInput(input) {
                session.addInput(input)
            }

            let output = AVCapturePhotoOutput()
            if session.canAddOutput(output) {
                session.addOutput(output)
            }

            DispatchQueue.main.async {
                let previewLayer = AVCaptureVideoPreviewLayer(session: session)
                previewLayer.frame = view.bounds
                previewLayer.videoGravity = .resizeAspectFill
                view.layer.addSublayer(previewLayer)

                self?.captureSession = session
                self?.photoOutput = output
                self?.previewLayer = previewLayer

                // Start the session on background thread
                DispatchQueue.global(qos: .userInitiated).async {
                    session.startRunning()
                }
            }
        }
    }

    func startSession() {
        guard let session = captureSession else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }

    func stopSession() {
        guard let session = captureSession else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            session.stopRunning()
        }
    }

    func toggleFlash(_ on: Bool) {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else { return }

        try? device.lockForConfiguration()
        device.torchMode = on ? .on : .off
        device.unlockForConfiguration()
    }

    func capturePhoto(completion: @escaping (UIImage) -> Void) {
        isCapturing = true
        captureCompletion = completion

        let settings = AVCapturePhotoSettings()
        photoOutput?.capturePhoto(with: settings, delegate: self)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.isCapturing = false
        }
    }
}

extension ScannerViewModel: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else { return }

        Task { @MainActor in
            captureCompletion?(image)
        }
    }
}
