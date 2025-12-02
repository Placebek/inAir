import VideoStream from '../components/VideoStream';

function Video() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Live Video</h1>
      <VideoStream />
    </div>
  );
}

export default Video;