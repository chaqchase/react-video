// Local VAST tags, so the ad examples and their tests never leave this site.
const track = (event: string) => `<![CDATA[/ads/track/${event}]]>`;

const preroll = `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="demo">
    <InLine>
      <AdSystem>react-video-kit</AdSystem>
      <AdTitle>Demo pre-roll</AdTitle>
      <Impression>${track("impression")}</Impression>
      <Creatives>
        <Creative>
          <Linear skipoffset="00:00:03">
            <Duration>00:00:08</Duration>
            <TrackingEvents>
              <Tracking event="start">${track("start")}</Tracking>
              <Tracking event="firstQuartile">${track("firstQuartile")}</Tracking>
              <Tracking event="complete">${track("complete")}</Tracking>
              <Tracking event="skip">${track("skip")}</Tracking>
            </TrackingEvents>
            <VideoClicks>
              <ClickThrough><![CDATA[https://github.com/chaqchase/react-video-kit]]></ClickThrough>
            </VideoClicks>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="640" height="360" bitrate="300"><![CDATA[/media/ad.mp4]]></MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>
`;

const TAGS: Record<string, string> = {
  "preroll.xml": preroll,
  "wrapper.xml": `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="wrapper">
    <Wrapper>
      <AdSystem>react-video-kit</AdSystem>
      <VASTAdTagURI><![CDATA[/ads/preroll.xml]]></VASTAdTagURI>
      <Impression>${track("wrapper-impression")}</Impression>
    </Wrapper>
  </Ad>
</VAST>
`,
  "empty.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0"></VAST>\n`,
};

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(TAGS).map((tag) => ({ tag }));

export async function GET(_request: Request, { params }: { params: Promise<{ tag: string }> }) {
  const body = TAGS[(await params).tag];
  return body
    ? new Response(body, { headers: { "Content-Type": "text/xml; charset=utf-8" } })
    : new Response("Not found", { status: 404 });
}
