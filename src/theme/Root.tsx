import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import ChatWidget from '@site/src/components/ChatWidget';

export default function Root({children}: {children: ReactNode}) {
  const {siteConfig} = useDocusaurusContext();
  const {chatApiUrl} = siteConfig.customFields ?? {};
  return (
    <>
      {children}
      {typeof chatApiUrl === 'string' && chatApiUrl !== '' && (
        <ChatWidget apiUrl={chatApiUrl} />
      )}
    </>
  );
}
