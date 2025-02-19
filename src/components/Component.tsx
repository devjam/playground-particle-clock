import { buttonGroup, Leva, useControls } from 'leva'
import React, { useEffect } from 'react'
import { isMobile } from 'react-device-detect'

const Component: React.FC = () => {
  const [{ param }, set] = useControls(() => ({
    param: {
      value: 10,
      min: 0,
      max: 100,
      step: 0.1,
    },
    note: {
      value: `説明文など`,
      editable: false,
    },
    ' ': buttonGroup({
      関連リンク: () => (location.href = 'https://example.com/'),
    }),
  }))

  useEffect(() => {
    // some
  }, [])

  return (
    <>
      <Leva
        hideCopyButton={true}
        collapsed={isMobile}
        titleBar={isMobile ? { position: { x: 10, y: -10 } } : true}
        theme={
          isMobile
            ? {
                sizes: {
                  titleBarHeight: '30px',
                },
              }
            : {}
        }
      />
      <div className="flex h-screen w-screen select-none items-center justify-center">
        <p className="text-4xl font-bold">{param}</p>
      </div>
    </>
  )
}

export default Component
