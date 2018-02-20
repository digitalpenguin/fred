<?php

namespace Fred\Endpoint\Ajax;

class GetElements extends Endpoint
{
    protected $allowedMethod = ['OPTIONS', 'GET'];
    
    public function process()
    {
        $categoryId = $this->fred->getOption('elements_category_id');
        
        if (empty($categoryId)) {
            return $this->data(['elements' => []]);
        }
        
        $elements = [];
        
        /** @var \modCategory[] $categories */
        $categories = $this->modx->getIterator('modCategory', [
            'parent' => $categoryId
        ]);
        
        foreach ($categories as $category) {
            $categoryElements = [
                'category' => $category->category,
                'elements' => []
            ];
            
            /** @var \modChunk[] $chunks */
            $chunks = $this->modx->getIterator('modChunk', ['category' => $category->id]);
            foreach ($chunks as $chunk) {
                $matches = [];
                preg_match('/image:([^\n]+)\n?/', $chunk->description, $matches);

                $image = '';
                $description = $chunk->description;

                if (count($matches) == 2) {
                    $image = $matches[1];
                    $description = str_replace($matches[0], '', $description);
                }

                $categoryElements['elements'][] = [
                    "id" => $chunk->id,
                    "title" => $chunk->name,
                    "description" => $description,
                    "image" => $image,
                    "content" => $chunk->content
                ];
            }
            
            $elements[] = $categoryElements;
        }
        
        

        return $this->data(['elements' => $elements]);
    }
}